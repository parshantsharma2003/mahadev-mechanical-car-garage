import React from 'react';
import { ShieldCheck, Car, Zap, CheckCircle2 } from 'lucide-react';
import { useGarage } from '../context/GarageContext';
import './StatsBar.css';

const ICON_MAP = {
  ShieldCheck,
  Car,
  Zap,
  CheckCircle: CheckCircle2,
  CheckCircle2
};

export default function StatsBar() {
  const { data } = useGarage();
  const rawStats = data?.stats || [];

  const defaultStats = [
    {
      id: 1,
      icon: ShieldCheck,
      value: "100% Genuine",
      label: "OEM & OES Parts"
    },
    {
      id: 2,
      icon: Car,
      value: "Multibrand",
      label: "Complete Service Bay"
    },
    {
      id: 3,
      icon: Zap,
      value: "Japanese Tech",
      label: "Carbon Cleaning"
    },
    {
      id: 4,
      icon: CheckCircle2,
      value: "Transparent",
      label: "Digital Job Cards"
    }
  ];

  const statItems = rawStats.length === 4 ? rawStats.map(s => ({
    id: s.id,
    icon: ICON_MAP[s.icon] || ShieldCheck,
    value: s.number,
    label: s.label
  })) : defaultStats;

  return (
    <div className="stats-bar-wrapper">
      <div className="container">
        <div className="stats-card">
          <div className="stats-grid">
            {statItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.id} className="stat-item">
                  <div className="stat-icon-wrap">
                    <IconComponent size={22} className="stat-icon-red" />
                  </div>
                  <div className="stat-text-wrap">
                    <span className="stat-value">{item.value}</span>
                    <span className="stat-label">{item.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
