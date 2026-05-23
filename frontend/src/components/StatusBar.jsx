import React from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { Database, FileJson, Cpu, ShieldAlert, CheckCircle } from 'lucide-react';

export default function StatusBar({ dbMode, isSaving }) {
  const { sandpack } = useSandpack();
  const { activeFile } = sandpack;

  const isLocalDB = dbMode && dbMode.includes('Local JSON');

  return (
    <div style={{
      height: '28px',
      background: '#04060c',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      fontSize: '0.725rem',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
      userSelect: 'none',
      zIndex: 10
    }}>
      
      {/* Left Area: Active File */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Cpu size={12} style={{ color: 'var(--secondary)' }} />
        <span>Workspace:</span>
        <span style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontWeight: '500'
        }}>
          {activeFile || 'No file open'}
        </span>
      </div>

      {/* Middle Area: Saving Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isSaving ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--warning)',
              boxShadow: '0 0 6px var(--warning)'
            }} />
            <span>Auto-saving state...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
            <CheckCircle size={10} />
            <span>Workspace synced</span>
          </div>
        )}
      </div>

      {/* Right Area: DB Connection Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: isLocalDB ? 'var(--warning)' : 'var(--success)',
          fontWeight: '500'
        }}>
          {isLocalDB ? <ShieldAlert size={12} /> : <Database size={12} />}
          <span>DB: {dbMode || 'Checking connection...'}</span>
        </div>
        
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '12px' }}>
          <span>v1.0.0</span>
        </div>
      </div>
      
    </div>
  );
}
