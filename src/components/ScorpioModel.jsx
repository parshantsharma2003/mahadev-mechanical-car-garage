import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_PATH = '/models/scorpio-n-black.glb';

// Pre-load model asset
useGLTF.preload(MODEL_PATH);

export default function ScorpioModel({ isInteracting, onInteractionChange, onLoaded }) {
  const groupRef = useRef();
  const { scene } = useGLTF(MODEL_PATH);

  // Notify parent component that the 3D model asset has loaded and is ready for rendering
  useEffect(() => {
    if (scene && onLoaded) {
      onLoaded();
    }
  }, [scene, onLoaded]);

  // Check user's motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // Assign premium glossy black automotive materials to the vehicle meshes (cloned instance)
  const preparedScene = React.useMemo(() => {
    if (!scene) return null;
    const cloned = scene.clone(true);

    // 1. Premium Glossy Black Automotive Paint Material
    const blackPaintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0A0A0C'),
      emissive: new THREE.Color('#030305'),
      roughness: 0.12,
      metalness: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95
    });

    // 2. Dark Tinted Automotive Glass Material
    const tintedGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0F172A'),
      transparent: true,
      opacity: 0.72,
      roughness: 0.05,
      metalness: 0.15,
      transmission: 0.55
    });

    // 3. Chrome & Alloy Rim Accents
    const chromeAccentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E2E8F0'),
      metalness: 0.95,
      roughness: 0.18
    });

    // 4. Heavy-duty Wheel & Rubber Material
    const wheelTireMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#141416'),
      roughness: 0.82,
      metalness: 0.15
    });

    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const matName = (child.material?.name || child.name || '').toLowerCase();

        if (matName.includes('cristales') || matName.includes('glass') || matName.includes('window')) {
          child.material = tintedGlassMaterial;
        } else if (matName.includes('ruedas') || matName.includes('wheel') || matName.includes('tire')) {
          child.material = wheelTireMaterial;
        } else if (matName.includes('chasis') || matName.includes('chrome') || matName.includes('metal')) {
          child.material = chromeAccentMaterial;
        } else if (matName.includes('carroceria') || matName.includes('body') || matName.includes('paint')) {
          child.material = blackPaintMaterial;
        } else {
          child.material = blackPaintMaterial;
        }
      }
    });

    return cloned;
  }, [scene]);

  // Initial front three-quarter view angle (~40 degrees)
  const initialAngle = 0.7;
  const rotationYRef = useRef(initialAngle);

  // Drag interaction variables
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const resumeTimerRef = useRef(null);

  // Frame-time based continuous smooth 360-degree rotation (30 seconds per full turn)
  const rotationSpeed = (2 * Math.PI) / 30;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!isInteracting && !isDraggingRef.current && !prefersReducedMotion) {
      rotationYRef.current += delta * rotationSpeed;
      if (rotationYRef.current > Math.PI * 2) {
        rotationYRef.current -= Math.PI * 2;
      }
    }

    groupRef.current.rotation.y = rotationYRef.current;
  });

  // Pointer event handlers on the 3D model for intuitive 360° horizontal drag
  const handlePointerDown = (e) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    lastXRef.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (onInteractionChange) onInteractionChange(true);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const deltaX = currentX - lastXRef.current;
    lastXRef.current = currentX;

    // Apply rotation based on drag movement
    rotationYRef.current += deltaX * 0.009;
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationYRef.current;
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    // Smoothly resume automatic rotation after 2.2 seconds of inactivity
    resumeTimerRef.current = setTimeout(() => {
      if (onInteractionChange) onInteractionChange(false);
    }, 2200);
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        resumeTimerRef.current = setTimeout(() => {
          if (onInteractionChange) onInteractionChange(false);
        }, 2200);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [onInteractionChange]);

  return (
    <group 
      ref={groupRef}
      position={[0, -0.6, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Invisible hit-cylinder ensuring seamless drag capture anywhere around the vehicle */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 2.2, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <primitive object={preparedScene} dispose={null} />
    </group>
  );
}
