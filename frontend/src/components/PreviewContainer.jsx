import React, { useRef, useEffect } from 'react';
import { SandpackPreview, SandpackConsole, useSandpack, useSandpackClient } from '@codesandbox/sandpack-react';
import { Play, Terminal, RotateCw, Globe, AlertCircle } from 'lucide-react';

function PreviewStatus() {
  const { sandpack } = useSandpack();
  const { status, error, files } = sandpack;

  // Debug: log what Sandpack actually has
  React.useEffect(() => {
    console.log('[Sandpack] status:', status);
    console.log('[Sandpack] error:', error);
    
    // Only log files on initial load, not on every status change
    if (status === 'initial') {
      console.log('[Sandpack] files:', Object.keys(files));
      if (files['/index.js']) {
        console.log('[Sandpack] /index.js:', files['/index.js'].code);
      }
      if (files['/App.js']) {
        console.log('[Sandpack] /App.js (first 80):', files['/App.js'].code?.slice(0, 80));
      }
      if (files['/package.json']) {
        console.log('[Sandpack] /package.json:', files['/package.json'].code);
      }
    }
  }, [status, error]);

  // Only show overlay for initial and error states
  // For idle and running, let the iframe show through
  if (status === 'initial') {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#94a3b8',
        fontSize: '0.85rem',
        zIndex: 2
      }}>
        Compiling preview…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1b4b',
        color: '#fca5a5',
        padding: '1.5rem',
        textAlign: 'center',
        gap: '0.75rem',
        zIndex: 2
      }}>
        <AlertCircle size={28} />
        <strong>Preview failed to compile</strong>
        <pre style={{ fontSize: '0.7rem', color: '#fca5a5', maxWidth: '320px', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {error?.message || JSON.stringify(error)}
        </pre>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '320px' }}>
          Open <strong>Console Logs</strong> for details.
        </span>
      </div>
    );
  }

  // For idle and running states, don't show any overlay
  return null;
}

export default function PreviewContainer({ activeTab, setActiveTab, projectName }) {
  const previewRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const { sandpack } = useSandpack();
  
  // Log sandpack status for debugging
  useEffect(() => {
    console.log('[PreviewContainer] Sandpack bundlerState:', sandpack.status);
    console.log('[PreviewContainer] Sandpack error:', sandpack.error);
    console.log('[PreviewContainer] Files in sandpack:', Object.keys(sandpack.files));
  }, [sandpack.status, sandpack.error]);

  // MutationObserver: forcibly hide Sandpack's overlay whenever it appears.
  useEffect(() => {
    const container = previewWrapperRef.current;
    if (!container) return;

    const hideOverlays = () => {
      // Only target specific overlay elements, NOT the preview container itself
      const selectors = [
        '.sp-cube-wrapper',    // Loading animation
        '.sp-sides',           // Loading animation sides
        '[class*="sp-overlay"]' // Explicit overlay classes
      ];
      
      let hiddenCount = 0;
      
      selectors.forEach(selector => {
        const elements = container.querySelectorAll(selector);
        elements.forEach(el => {
          const computed = window.getComputedStyle(el);
          
          // Only hide if it's actually visible
          if (computed.display !== 'none' && computed.visibility !== 'hidden') {
            console.log('[Overlay Hider] Hiding loading element:', {
              tag: el.tagName,
              class: el.className
            });
            
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            hiddenCount++;
          }
        });
      });
      
      if (hiddenCount > 0) {
        console.log('[Overlay Hider] Hid', hiddenCount, 'loading overlays');
      }
    };

    // Run immediately
    hideOverlays();
    
    // Run on a timer to catch late-appearing overlays
    const intervalId = setInterval(hideOverlays, 200);

    const observer = new MutationObserver(() => {
      hideOverlays();
    });

    observer.observe(container, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['style', 'class'] 
    });

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  const handleRefresh = () => {
    if (previewRef.current) {
      const client = previewRef.current.getClient();
      if (client) {
        console.log('[Preview] Refreshing iframe');
        client.iframe.contentWindow.location.reload();
      }
    }
  };

  // Debug: Check iframe content
  useEffect(() => {
    const checkIframe = () => {
      const iframe = previewWrapperRef.current?.querySelector('iframe');
      if (iframe) {
        console.log('[Preview] Iframe found:', {
          src: iframe.src,
          width: iframe.offsetWidth,
          height: iframe.offsetHeight,
          display: window.getComputedStyle(iframe).display,
          visibility: window.getComputedStyle(iframe).visibility,
          opacity: window.getComputedStyle(iframe).opacity
        });
        
        // Try to access iframe content (may fail due to CORS)
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            console.log('[Preview] Iframe document:', {
              readyState: iframeDoc.readyState,
              bodyHTML: iframeDoc.body?.innerHTML?.slice(0, 200)
            });
          }
        } catch (e) {
          console.log('[Preview] Cannot access iframe content (CORS):', e.message);
        }
      } else {
        console.log('[Preview] No iframe found in container');
      }
    };
    
    const timer = setTimeout(checkIframe, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="preview-pane">
      <div className="preview-tabs">
        <button
          className={`preview-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Play size={12} />
          <span>Live Preview</span>
        </button>

        <button
          className={`preview-tab ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => setActiveTab('console')}
        >
          <Terminal size={12} />
          <span>Console Logs</span>
        </button>
      </div>

      {activeTab === 'preview' && (
        <div style={{
          height: '32px',
          background: '#101524',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 0.75rem',
          gap: '0.5rem',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '5px', width: '60px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          </div>

          <div style={{
            flex: 1,
            maxWidth: '480px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            <Globe size={10} />
            <span>localhost:3000/sandbox/{projectName.toLowerCase().replace(/\s+/g, '-')}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleRefresh}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Reload Frame"
            >
              <RotateCw size={12} />
            </button>
          </div>
        </div>
      )}

      <div ref={previewWrapperRef} style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, background: '#ffffff' }}>
        {activeTab === 'preview' ? (
          <>
            <PreviewStatus />
            {/* Wrapper that clips Sandpack's overlay via z-index layering */}
            <div style={{ 
              flex: 1, 
              minHeight: 0, 
              position: 'relative', 
              overflow: 'hidden',
              background: '#ffffff',
              border: '2px solid red' /* DEBUG: Make iframe container visible */
            }}>
              <SandpackPreview
                ref={previewRef}
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                style={{
                  position: 'absolute',
                  inset: 0,
                  height: '100%',
                  width: '100%',
                  border: '3px solid blue', /* DEBUG: Make iframe visible */
                  background: '#ffffff'
                }}
              />
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            background: '#0d0d0d',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            padding: '0.5rem',
            overflowY: 'auto'
          }}>
            <SandpackConsole
              standalone
              showHeader={false}
              showSyntaxError
              style={{
                height: '100%',
                background: 'transparent',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
