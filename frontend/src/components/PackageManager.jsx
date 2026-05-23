import React, { useState } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { Blocks, Plus, Trash2, Loader, Search } from 'lucide-react';

export default function PackageManager() {
  const { sandpack } = useSandpack();
  const { files, updateFile } = sandpack;

  const [packageName, setPackageName] = useState('');
  const [packageVersion, setPackageVersion] = useState('latest');
  const [isInstalling, setIsInstalling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Popular recommended packages for candidates to quick-install
  const recommendedPackages = [
    { name: 'canvas-confetti', desc: 'Beautiful party confetti animations' },
    { name: 'axios', desc: 'Promise based HTTP client' },
    { name: 'lodash', desc: 'Modern JavaScript utility library' },
    { name: 'lucide-react', desc: 'Beautifully simple pixel-art icons' }
  ];

  // Parse package.json dependencies
  const getDependencies = () => {
    try {
      const packageJsonFile = files['/package.json'];
      if (!packageJsonFile) return {};
      const pkg = JSON.parse(packageJsonFile.code);
      return pkg.dependencies || {};
    } catch (err) {
      console.error('Failed to parse package.json', err);
      return {};
    }
  };

  const dependencies = getDependencies();

  const handleInstall = async (pkgName, pkgVer = 'latest') => {
    if (!pkgName || pkgName.trim() === '') return;
    setErrorMsg('');
    setIsInstalling(true);

    try {
      const packageJsonFile = files['/package.json'];
      if (!packageJsonFile) {
        throw new Error('package.json not found in the workspace.');
      }

      const pkg = JSON.parse(packageJsonFile.code);
      if (!pkg.dependencies) pkg.dependencies = {};

      // Normalise name
      const name = pkgName.trim().toLowerCase();
      const version = pkgVer.trim() || 'latest';

      // Check if already installed
      if (pkg.dependencies[name]) {
        setErrorMsg(`Package "${name}" is already installed.`);
        setIsInstalling(false);
        return;
      }

      // We'll update the package.json file.
      // Sandpack will read this and automatically fetch the package from unpkg or cdn.
      pkg.dependencies[name] = version;
      const updatedCode = JSON.stringify(pkg, null, 2);

      updateFile('/package.json', updatedCode);
      
      setPackageName('');
      setPackageVersion('latest');
      
      // Simulate nice micro-loader for dynamic install visual satisfaction
      setTimeout(() => {
        setIsInstalling(false);
      }, 1000);

    } catch (err) {
      console.error('Error installing package', err);
      setErrorMsg(err.message || 'Failed to update package.json');
      setIsInstalling(false);
    }
  };

  const handleUninstall = (name) => {
    try {
      const packageJsonFile = files['/package.json'];
      if (!packageJsonFile) return;

      const pkg = JSON.parse(packageJsonFile.code);
      if (pkg.dependencies && pkg.dependencies[name]) {
        delete pkg.dependencies[name];
        const updatedCode = JSON.stringify(pkg, null, 2);
        updateFile('/package.json', updatedCode);
      }
    } catch (err) {
      console.error('Error uninstalling package', err);
      setErrorMsg('Failed to delete package.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* Install Package Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Install NPM Package
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%', paddingLeft: '28px', fontSize: '0.8rem' }}
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. canvas-confetti, axios"
              disabled={isInstalling}
            />
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          
          <button
            className="btn-primary"
            style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', minWidth: '72px', justifyContent: 'center' }}
            onClick={() => handleInstall(packageName, packageVersion)}
            disabled={isInstalling || !packageName}
          >
            {isInstalling ? <Loader size={14} className="spin" style={{ animation: 'spin-animation 1.5s linear infinite' }} /> : 'Install'}
          </button>
        </div>
        {errorMsg && (
          <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>{errorMsg}</span>
        )}
      </div>

      {/* Installed Packages List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Installed Packages ({Object.keys(dependencies).length})
        </span>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.03)',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '8px',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {Object.keys(dependencies).length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No custom packages installed.
            </div>
          ) : (
            Object.entries(dependencies).map(([name, version]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.02)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)' }}>{name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{version}</span>
                </div>
                
                {name !== 'react' && name !== 'react-dom' && (
                  <button
                    onClick={() => handleUninstall(name)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Uninstall Package"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Suggested Packages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Suggested Packages
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {recommendedPackages.map(pkg => (
            <div
              key={pkg.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '78%' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--secondary)' }}>{pkg.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.desc}</span>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '0.7rem' }}
                onClick={() => handleInstall(pkg.name, 'latest')}
                disabled={isInstalling || !!dependencies[pkg.name]}
              >
                {dependencies[pkg.name] ? 'Added' : <Plus size={10} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin-animation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
