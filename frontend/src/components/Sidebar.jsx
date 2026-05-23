import React from 'react';
import { FolderTree, Blocks, Database, Info } from 'lucide-react';

export default function Sidebar({ activePanel, setActivePanel }) {
  const navItems = [
    { id: 'explorer', label: 'File Explorer', icon: FolderTree },
    { id: 'packages', label: 'Package Manager', icon: Blocks },
    { id: 'projects', label: 'Saved Projects', icon: Database },
    { id: 'info', label: 'About Sandbox', icon: Info }
  ];

  return (
    <div className="side-nav-vertical">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', alignItems: 'center' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => setActivePanel(item.id)}
              data-tooltip={item.label}
              aria-label={item.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        {/* Decorative elements */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--secondary)',
          boxShadow: '0 0 8px var(--secondary)'
        }} />
      </div>
    </div>
  );
}
