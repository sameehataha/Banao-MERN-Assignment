import React, { useState } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { File, Folder, FolderOpen, FileCode, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { isShimPath } from '../utils/normalizeSandpackFiles';

export default function FileExplorer() {
  const { sandpack } = useSandpack();
  const { files, activeFile, deleteFile, updateFile, setActiveFile } = sandpack;

  const [expandedFolders, setExpandedFolders] = useState({ '/': true, '/src': true });
  const [showInput, setShowInput] = useState(null); // 'file' or 'folder'
  const [newItemName, setNewItemName] = useState('');

  // Safeguard: Prevent deleting essential files
  const isEssentialFile = (path) => {
    return ['/package.json', '/src/main.jsx'].includes(path);
  };

  // Convert flat files object to directory tree
  const buildTree = () => {
    const root = { name: 'root', type: 'folder', path: '', children: {} };

    const usesSrcLayout = Boolean(files['/src/main.jsx']);

    Object.keys(files).forEach(filePath => {
      if (usesSrcLayout && isShimPath(filePath)) return;

      const parts = filePath.split('/').filter(Boolean);
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const currentPath = current.path + '/' + part;

        if (isFile) {
          current.children[part] = {
            name: part,
            type: 'file',
            path: filePath
          };
        } else {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              type: 'folder',
              path: currentPath,
              children: {}
            };
          }
          current = current.children[part];
        }
      });
    });

    return root;
  };

  const tree = buildTree();

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    let targetPath = newItemName.trim();
    if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }

    if (showInput === 'file') {
      // Create empty file
      updateFile(targetPath, `// Code for ${targetPath}\nexport default function MyComponent() {\n  return <div>Component</div>;\n}`);
      setActiveFile(targetPath);
    } else if (showInput === 'folder') {
      // In sandpack, folders are virtual and exist only when files exist inside them
      // We create a placeholder file to preserve the folder
      const placeholderPath = `${targetPath}/.keep`;
      updateFile(placeholderPath, '// Placeholder to keep folder');
      setExpandedFolders(prev => ({ ...prev, [targetPath]: true }));
    }

    setNewItemName('');
    setShowInput(null);
  };

  // Render tree node recursively
  const renderNode = (node) => {
    if (node.type === 'file') {
      const isActive = activeFile === node.path;
      // Skip placeholder files
      if (node.name === '.keep') return null;

      const isReactComponent = node.name.endsWith('.jsx') || node.name.endsWith('.tsx');

      return (
        <div
          key={node.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px 4px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
            color: isActive ? 'var(--secondary)' : 'var(--text-secondary)',
            fontWeight: isActive ? '600' : '400',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            transition: 'background 0.15s'
          }}
          onClick={() => setActiveFile(node.path)}
          className="explorer-file-item"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isReactComponent ? <FileCode size={14} style={{ color: '#61dafb' }} /> : <File size={14} />}
            <span>{node.name}</span>
          </div>

          {!isEssentialFile(node.path) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete ${node.name}?`)) {
                  deleteFile(node.path);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                opacity: 0,
                transition: 'opacity 0.2s'
              }}
              className="explorer-delete-btn"
              title="Delete File"
            >
              <Trash2 size={13} hover-color="var(--error)" />
            </button>
          )}
        </div>
      );
    }

    // Folders
    const isExpanded = !!expandedFolders[node.path];
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Don't render root itself in children list
    if (node.path === '') {
      return (
        <div key="root-explorer">
          {sortedChildren.map(child => renderNode(child))}
        </div>
      );
    }

    return (
      <div key={node.path} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: '500',
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.15s'
          }}
          onClick={() => toggleFolder(node.path)}
          className="explorer-folder-item"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
            {isExpanded ? <FolderOpen size={14} style={{ color: '#f59e0b' }} /> : <Folder size={14} style={{ color: '#e2e8f0' }} />}
            <span>{node.name}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedFolders(prev => ({ ...prev, [node.path]: true }));
              setShowInput('file');
              setNewItemName(node.path + '/');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 0.2s'
            }}
            className="explorer-folder-action-btn"
            title="Create File in Folder"
          >
            <Plus size={13} />
          </button>
        </div>

        {isExpanded && (
          <div style={{ paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.03)', marginLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sortedChildren.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Create Buttons Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
        <button
          className="btn-secondary"
          style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', justifyContent: 'center' }}
          onClick={() => {
            setShowInput(showInput === 'file' ? null : 'file');
            setNewItemName('/src/');
          }}
        >
          <Plus size={14} /> New File
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', justifyContent: 'center' }}
          onClick={() => {
            setShowInput(showInput === 'folder' ? null : 'folder');
            setNewItemName('/src/');
          }}
        >
          <Plus size={14} /> Folder
        </button>
      </div>

      {/* Input Overlay */}
      {showInput && (
        <form onSubmit={handleCreateItem} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Creating new {showInput}...
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              className="input-field"
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={showInput === 'file' ? '/src/components/MyFile.jsx' : '/src/components'}
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ padding: '4px 8px', borderRadius: '6px' }}>Add</button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 8px', borderRadius: '6px' }}
              onClick={() => setShowInput(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }} className="file-tree-container">
        {renderNode(tree)}
      </div>

      {/* CSS overrides for hover visibility */}
      <style>{`
        .explorer-file-item:hover .explorer-delete-btn,
        .explorer-folder-item:hover .explorer-folder-action-btn {
          opacity: 1 !important;
        }
        .explorer-delete-btn:hover {
          color: var(--error) !important;
        }
        .explorer-folder-action-btn:hover {
          color: var(--secondary) !important;
        }
      `}</style>
    </div>
  );
}
