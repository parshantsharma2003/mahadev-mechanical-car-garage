import React from 'react';
import { Users, ShieldCheck, Star, Car } from 'lucide-react';
import './StatsBar.css';

export default function StatsBar() {
  const statItems = [
    {
      id: 1,
      icon: Users,
      value: "5000+",
      label: "Happy Customers"
    },
    {
      id: 2,
      icon: ShieldCheck,
      value: "Trusted",
      label: "Car Owners in Haryana"
    },
    {
      id: 3,
      icon: Star,
      value: "4.8/5",
      label: "Customer Rating"
    },
    {
      id: 4,
      icon: Car,
      value: "All Brands",
      label: "Servicing & Repair"
    }
  ];

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
