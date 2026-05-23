import React, { useEffect, useState } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import Editor from '@monaco-editor/react';
import { File, FileCode, X, Play, Save, Check, RefreshCw } from 'lucide-react';

export default function EditorContainer({ openTabs, setOpenTabs, isSaving, handleManualSave }) {
  const { sandpack } = useSandpack();
  const { files, activeFile, updateFile, setActiveFile } = sandpack;

  const [hasSavedRecently, setHasSavedRecently] = useState(false);

  // Auto-sync open tabs with active file
  useEffect(() => {
    if (activeFile && !openTabs.includes(activeFile)) {
      setOpenTabs(prev => [...prev, activeFile]);
    }
  }, [activeFile, openTabs, setOpenTabs]);

  const handleTabClose = (path, e) => {
    e.stopPropagation();
    const remainingTabs = openTabs.filter(t => t !== path);
    setOpenTabs(remainingTabs);

    // If closing active tab, switch to another
    if (activeFile === path && remainingTabs.length > 0) {
      setActiveFile(remainingTabs[remainingTabs.length - 1]);
    }
  };

  // Determine file language for Monaco Editor syntax highlighting
  const getLanguage = (filepath) => {
    if (filepath.endsWith('.jsx') || filepath.endsWith('.js')) return 'javascript';
    if (filepath.endsWith('.html')) return 'html';
    if (filepath.endsWith('.css')) return 'css';
    if (filepath.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  const getFileIcon = (filename) => {
    if (filename.endsWith('.jsx') || filename.endsWith('.js')) {
      return <FileCode size={14} style={{ color: '#61dafb' }} />;
    }
    return <File size={14} style={{ color: 'var(--text-muted)' }} />;
  };

  const handleEditorChange = (value) => {
    if (!activeFile) return;
    const code = value || '';
    updateFile(activeFile, code);

    // Keep Sandpack template shims in sync so Live Preview matches /src edits
    if (activeFile === '/src/App.jsx') {
      updateFile('/App.js', code);
    }
    if (activeFile === '/src/index.css') {
      updateFile('/styles.css', code);
    }
  };

  const triggerManualSave = async () => {
    await handleManualSave();
    setHasSavedRecently(true);
    setTimeout(() => {
      setHasSavedRecently(false);
    }, 2000);
  };

  return (
    <div style={{
      flex: 1.2, // Editor takes slightly more space than preview
      display: 'flex',
      flexDirection: 'column',
      background: '#1e1e1e', // Standard Monaco Dark background
      borderRight: '1px solid var(--border-color)',
      overflow: 'hidden'
    }}>
      
      {/* Editor Header: Tabs & Save Buttons */}
      <div style={{
        height: '38px',
        background: '#181818',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0.5rem 0 0',
        overflow: 'hidden'
      }}>
        {/* Tabs Scroll Area */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          height: '100%',
          alignItems: 'flex-end',
          scrollbarWidth: 'none' // Firefox
        }} className="tabs-container">
          {openTabs.map(path => {
            const isActive = activeFile === path;
            const filename = path.split('/').pop() || path;
            return (
              <div
                key={path}
                onClick={() => setActiveFile(path)}
                style={{
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 0.75rem',
                  background: isActive ? '#1e1e1e' : '#141414',
                  borderTop: isActive ? '2px solid var(--secondary)' : '2px solid transparent',
                  borderRight: '1px solid rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  gap: '6px',
                  transition: 'background 0.15s, color 0.15s',
                  userSelect: 'none'
                }}
              >
                {getFileIcon(filename)}
                <span>{filename}</span>
                
                <button
                  onClick={(e) => handleTabClose(path, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={triggerManualSave}
            disabled={isSaving}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              height: '26px',
              borderColor: hasSavedRecently ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)',
              background: hasSavedRecently ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              color: hasSavedRecently ? 'var(--success)' : 'var(--text-primary)'
            }}
          >
            {isSaving ? (
              <RefreshCw size={12} className="spin" style={{ animation: 'spin-animation 1s linear infinite' }} />
            ) : hasSavedRecently ? (
              <Check size={12} />
            ) : (
              <Save size={12} />
            )}
            <span style={{ marginLeft: '4px' }}>{hasSavedRecently ? 'Saved!' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Editor Component */}
      <div style={{ flex: 1, position: 'relative' }}>
        {activeFile && files[activeFile] ? (
          <Editor
            height="100%"
            theme="vs-dark"
            path={activeFile}
            language={getLanguage(activeFile)}
            value={files[activeFile].code}
            onChange={handleEditorChange}
            loading={
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1e1e1e',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                Loading Editor Workspace...
              </div>
            }
            options={{
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              lineHeight: 20,
              minimap: { enabled: false },
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12, bottom: 12 }
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <span>No File Selected</span>
            <span style={{ fontSize: '0.75rem' }}>Select a file in the explorer sidebar to begin coding</span>
          </div>
        )}
      </div>

      <style>{`
        .tabs-container::-webkit-scrollbar {
          display: none; /* Hide tab scrollbar for clean layout */
        }
      `}</style>
    </div>
  );
}
