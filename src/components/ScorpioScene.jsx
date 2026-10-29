import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import ScorpioModel from './ScorpioModel';
import ScorpioFallback from './ScorpioFallback';

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('3D Car Scene WebGL Notice:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function ScorpioScene() {
  const [webGLSupported] = useState(() => isWebGLAvailable());
  const [isModelReady, setIsModelReady] = useState(false);
  const [showFallback, setShowFallback] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);

  // When model is ready, gracefully transition and then unmount fallback to eliminate duplicate overhead
  const handleModelReady = () => {
    setIsModelReady(true);
    setTimeout(() => {
      setShowFallback(false);
    }, 450);
  };

  if (!webGLSupported) {
    return <ScorpioFallback />;
  }

  return (
    <div 
      className="scorpio-canvas-wrapper" 
      aria-label="Interactive 3D model of Glossy Black Mahindra Scorpio-N SUV. Drag horizontally to rotate 360 degrees."
    >
      {/* 1. Fast, preloaded visual placeholder guarantees the car NEVER disappears during reload or initial fetch */}
      {showFallback && (
        <div className={`scorpio-fallback-container ${isModelReady ? 'is-hidden' : 'is-visible'}`}>
          <ScorpioFallback />
        </div>
      )}

      {/* 2. Interactive 3D WebGL Canvas */}
      <SceneErrorBoundary fallback={<ScorpioFallback />}>
        <div className={`scorpio-three-container ${isModelReady ? 'is-visible' : 'is-hidden'}`}>
          <Canvas
            className="scorpio-three-canvas"
            dpr={[1, 2]}
            gl={{ 
              antialias: true, 
              alpha: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true
            }}
            camera={{ position: [3.8, 1.4, 4.2], fov: 38 }}
          >
            {/* Studio Lighting Rig specifically tuned for Black Automotive Body Panels */}
            {/* 1. Ambient Baseline */}
            <ambientLight intensity={1.4} color="#E2E8F0" />

            {/* 2. Key Front-Right Light: Crisp specular highlights across hood and front fascia */}
            <directionalLight 
              position={[6, 7, 6]} 
              intensity={3.8} 
              color="#FFFFFF" 
              castShadow 
            />

            {/* 3. Front-Left Fill Light: Illuminates driver side and front grille contours */}
            <directionalLight 
              position={[-5, 4, 6]} 
              intensity={2.4} 
              color="#F1F5F9" 
            />

            {/* 4. High-Contrast Cool Rim Light: Separates muscular black roofline from dark background */}
            <directionalLight 
              position={[-7, 6, -6]} 
              intensity={4.2} 
              color="#93C5FD" 
            />

            {/* 5. Rear-Right Rim Light: Accentuates passenger rear quarter panel */}
            <directionalLight 
              position={[7, 4, -5]} 
              intensity={2.8} 
              color="#E2E8F0" 
            />

            {/* 6. Top Overhead Softbox: Accentuates roof rails and hood lines */}
            <directionalLight 
              position={[0, 9, 0]} 
              intensity={2.2} 
              color="#FFFFFF" 
            />

            {/* 7. Garage Brand Red Subtle Underglow: Consistent with Mahadev red branding */}
            <pointLight 
              position={[0, -0.4, 0]} 
              intensity={2.5} 
              distance={7} 
              color="#DC2626" 
            />

            <Suspense fallback={null}>
              {/* 3D Black SUV Model on Turntable */}
              <ScorpioModel 
                isInteracting={isInteracting} 
                onInteractionChange={setIsInteracting} 
                onLoaded={handleModelReady}
              />

              {/* Realistic Contact Shadow on Studio Ground */}
              <ContactShadows
                position={[0, -0.6, 0]}
                opacity={0.85}
                scale={9}
                blur={2.0}
                far={4}
                color="#020617"
              />
            </Suspense>
          </Canvas>
        </div>
      </SceneErrorBoundary>
    </div>
  );
}
