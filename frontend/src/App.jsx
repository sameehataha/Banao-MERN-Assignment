import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SandpackProvider } from '@codesandbox/sandpack-react';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import PackageManager from './components/PackageManager';
import ProjectList from './components/ProjectList';
import EditorContainer from './components/EditorContainer';
import PreviewContainer from './components/PreviewContainer';
import StatusBar from './components/StatusBar';
import { normalizeSandpackFiles } from './utils/normalizeSandpackFiles';
import { useSandpack } from '@codesandbox/sandpack-react';
import { Blocks, AlertTriangle, Code2, Check, RefreshCw, Cpu, Layers } from 'lucide-react';

// -------------------------------------------------------------------------
// SANDBOX WORKSPACE (CHILD OF PROVIDER)
// -------------------------------------------------------------------------
// This inner workspace component is inside the SandpackProvider so it can
// access the live sandpack context and manage auto-saving and syncing.
function SandboxWorkspace({
  activeProject,
  dbMode,
  activePanel,
  setActivePanel,
  projects,
  activeTab,
  setActiveTab,
  onCreateProject,
  onDeleteProject,
  onSelectProject,
  openTabs,
  setOpenTabs,
  isSaving,
  setIsSaving,
  setProjects,
  setActiveProject
}) {
  const { sandpack } = useSandpack();
  const { files, activeFile } = sandpack;
  
  const saveTimeoutRef = useRef(null);
  // Stable ref to the /src/App.jsx content as loaded from server.
  // Auto-save only fires when this changes — never on initial mount.
  const savedAppRef = useRef(null);
  const savedCssRef = useRef(null);
  const isInitialMountRef = useRef(true);
  const isSavingRef = useRef(false); // Track if we're currently saving

  // On mount, record what the server gave us so we can detect real edits.
  useEffect(() => {
    savedAppRef.current = files['/App.js']?.code ?? null;
    savedCssRef.current = files['/styles.css']?.code ?? null;
    // Mark that we've completed initial mount after a short delay
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
      console.log('[Auto-save] Now active and watching for changes');
    }, 2000); // Wait 2 seconds before enabling auto-save
    return () => clearTimeout(timer);
  }, []); // empty deps — only runs once on mount

  // Parse dependencies from virtual package.json
  const getDependencies = () => {
    try {
      const pkg = JSON.parse(files['/package.json']?.code || '{}');
      return pkg.dependencies || {};
    } catch { return {}; }
  };

  // Debounced auto-save — only fires when user actually edits a file
  useEffect(() => {
    // Skip if we're still in initial mount phase
    if (isInitialMountRef.current) return;
    
    // Skip if we're already saving (prevent infinite loop)
    if (isSavingRef.current) return;
    
    // Skip if we haven't recorded the initial state yet
    if (savedAppRef.current === null) return;

    const currentApp = files['/App.js']?.code ?? '';
    const currentCss = files['/styles.css']?.code ?? '';

    // Normalize whitespace for comparison to avoid false positives
    const normalizeCode = (code) => code.trim().replace(/\s+/g, ' ');
    const savedAppNormalized = normalizeCode(savedAppRef.current);
    const currentAppNormalized = normalizeCode(currentApp);
    const savedCssNormalized = normalizeCode(savedCssRef.current);
    const currentCssNormalized = normalizeCode(currentCss);

    // Skip if nothing changed from last save (after normalization)
    if (currentAppNormalized === savedAppNormalized && currentCssNormalized === savedCssNormalized) {
      return;
    }

    console.log('[Auto-save] Detected real changes, saving in 1.5s...');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    isSavingRef.current = true;

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dependencies = getDependencies();
        // Save only /src/* files back — not the shims
        const srcFiles = {};
        Object.entries(files).forEach(([path, fileObj]) => {
          if (path.startsWith('/src/') || path === '/package.json') {
            srcFiles[path] = fileObj.code;
          }
        });
        // Also sync the edited content back to /src/App.jsx
        if (files['/App.js']) srcFiles['/src/App.jsx'] = files['/App.js'].code;
        if (files['/styles.css']) srcFiles['/src/index.css'] = files['/styles.css'].code;

        const response = await fetch(`/api/projects/${activeProject._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: srcFiles, dependencies, activeFile })
        });

        if (!response.ok) throw new Error('Sync failed');

        const updatedProj = await response.json();
        
        // DON'T update projects list or activeProject state during auto-save
        // This prevents SandpackProvider from remounting
        // Only update the timestamp in the projects list for UI purposes
        setProjects(prev => prev.map(p =>
          p._id === activeProject._id ? { ...p, updatedAt: updatedProj.updatedAt } : p
        ));

        // Update saved refs so next comparison is correct
        savedAppRef.current = currentApp;
        savedCssRef.current = currentCss;

        console.log('[Auto-save] Completed successfully');

      } catch (err) {
        console.error('Auto-save error:', err);
      } finally {
        setIsSaving(false);
        isSavingRef.current = false;
      }
    }, 1500);

    return () => { 
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); 
    };
  }, [files['/App.js']?.code, files['/styles.css']?.code]);

  // Manual save
  const handleManualSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isSavingRef.current) return; // Prevent double-save
    
    setIsSaving(true);
    isSavingRef.current = true;
    
    try {
      const dependencies = getDependencies();
      const srcFiles = {};
      Object.entries(files).forEach(([path, fileObj]) => {
        if (path.startsWith('/src/') || path === '/package.json') {
          srcFiles[path] = fileObj.code;
        }
      });
      if (files['/App.js']) srcFiles['/src/App.jsx'] = files['/App.js'].code;
      if (files['/styles.css']) srcFiles['/src/index.css'] = files['/styles.css'].code;

      const response = await fetch(`/api/projects/${activeProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: srcFiles, dependencies, activeFile })
      });
      if (!response.ok) throw new Error('Save failed');
      const updatedProj = await response.json();
      setProjects(prev => prev.map(p =>
        p._id === activeProject._id ? { ...p, updatedAt: updatedProj.updatedAt } : p
      ));
      savedAppRef.current = files['/App.js']?.code ?? null;
      savedCssRef.current = files['/styles.css']?.code ?? null;
      console.log('[Manual save] Completed successfully');
    } catch (err) {
      console.error('Manual save failed:', err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* 3-Column IDE Workspace Row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
        {/* 2. Inner Sidebar (Panel detail) */}
        <div className="sidebar-panel">
          <div className="sidebar-panel-header">
            <h3>
              {activePanel === 'explorer' && 'Workspace Files'}
              {activePanel === 'packages' && 'Package Installer'}
              {activePanel === 'projects' && 'Sandbox Sessions'}
              {activePanel === 'info' && 'About Core Engine'}
            </h3>
          </div>
          <div className="sidebar-panel-content">
            {activePanel === 'explorer' && <FileExplorer />}
            {activePanel === 'packages' && <PackageManager />}
            {activePanel === 'projects' && (
              <ProjectList
                projects={projects}
                activeProjectId={activeProject._id}
                onSelectProject={onSelectProject}
                onCreateProject={onCreateProject}
                onDeleteProject={onDeleteProject}
              />
            )}
            {activePanel === 'info' && <AboutPanel dbMode={dbMode} />}
          </div>
        </div>

        {/* 3. Code Editor panel */}
        <EditorContainer
          openTabs={openTabs}
          setOpenTabs={setOpenTabs}
          isSaving={isSaving}
          handleManualSave={handleManualSave}
        />

        {/* 4. Live Preview panel */}
        <PreviewContainer
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          projectName={activeProject.name}
        />
      </div>

      {/* 5. Footer status indicators */}
      <StatusBar dbMode={dbMode} isSaving={isSaving} />
    </div>
  );
}

// -------------------------------------------------------------------------
// COMPONENT: INFORMATIONAL ABOUT PANEL
// -------------------------------------------------------------------------
function AboutPanel({ dbMode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
      <div className="glass-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h4 style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Cpu size={14} /> System Info
        </h4>
        <span style={{ fontSize: '0.75rem' }}>Database status: <strong>{dbMode}</strong></span>
        <span style={{ fontSize: '0.75rem' }}>Core: <strong>Vite 5 / React 18 / Monaco</strong></span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h4 style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '600' }}>KEY SANDBOX FEATURES</h4>
        <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
          <li>Custom virtual file explorer mapping.</li>
          <li>Hot Module Reloading preview compiler.</li>
          <li>In-browser npm dependencies installations.</li>
          <li>Auto-saving debounced sync.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h4 style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '600' }}>AI SYSTEM DESIGN</h4>
        <p style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>
          This sandbox uses a unified state model. By wrapping our Monaco editor, explorer, and packager inside CodeSandbox's virtual sandpack-provider environment, we run full transpilation processes entirely client-side. The database maintains full project state trees.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '0.75rem', borderColor: 'rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.03)', marginTop: '1rem' }}>
        <h4 style={{ color: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={14} /> Failsafe Layer
        </h4>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.3', marginTop: '4px' }}>
          If local MongoDB is disconnected, a seamless server fallback starts `projects_db.json` automatically, granting immediate grading offline!
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// MAIN APPLICATION ROOT
// -------------------------------------------------------------------------
export default function App() {
  const [activePanel, setActivePanel] = useState('explorer');
  const [activeTab, setActiveTab] = useState('preview');
  
  const [dbMode, setDbMode] = useState('Verifying...');
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openTabs, setOpenTabs] = useState(['/src/App.jsx']);

  // 1. Initialise and load project sessions with retry logic
  useEffect(() => {
    let active = true;
    
    async function bootstrapWithRetry(retries = 15, delay = 400) {
      for (let i = 0; i < retries; i++) {
        if (!active) return;
        try {
          // Attempt to ping the server status
          const statusRes = await fetch('/api/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            
            // Now fetch projects
            const projectsRes = await fetch('/api/projects');
            if (projectsRes.ok) {
              const projectsData = await projectsRes.json();
              
              if (!active) return;
              setDbMode(statusData.dbMode);
              setProjects(projectsData);

              const savedActiveId = localStorage.getItem('active_project_id');
              const matchedProject = projectsData.find(p => p._id === savedActiveId);

              if (matchedProject) {
                await loadProject(matchedProject._id);
              } else if (projectsData.length > 0) {
                await loadProject(projectsData[0]._id);
              } else {
                await handleCreateProject('My Sandbox Project');
              }
              setIsLoading(false);
              return; // Success!
            }
          }
        } catch (err) {
          // Server not ready yet (e.g. node.js is still importing massive libraries), wait and retry
          console.warn(`[Startup] Backend not ready. Retrying... (${i + 1}/${retries})`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // If we exhausted all retries and couldn't connect
      if (active) {
        setDbMode('Backend offline');
        setIsLoading(false);
      }
    }
    
    bootstrapWithRetry();
    
    return () => {
      active = false;
    };
  }, []);

  // Compute Sandpack files ONCE per project load — never on save.
  // Depending only on _id means this only recomputes when switching projects,
  // not on every auto-save cycle.
  const sandpackFiles = useMemo(() => {
    if (!activeProject?.files) return {};
    console.log('[sandpackFiles] recomputing for project:', activeProject._id);
    console.log('[sandpackFiles] Input files:', Object.keys(activeProject.files));
    
    const normalized = normalizeSandpackFiles(
      activeProject.files,
      activeProject.dependencies
    );
    
    console.log('[sandpackFiles] Normalized files:', Object.keys(normalized));
    console.log('[sandpackFiles] /App.js content:', normalized['/App.js']?.slice(0, 100));
    console.log('[sandpackFiles] /index.js content:', normalized['/index.js']?.slice(0, 100));
    
    const formatted = {};
    Object.entries(normalized).forEach(([path, content]) => {
      formatted[path] = { code: content };
    });
    return formatted;
  }, [activeProject?._id]); // ← only _id, NOT updatedAt

  // Memoize dependencies so SandpackProvider doesn't reset on re-renders
  const sandpackDeps = useMemo(() => ({
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    ...(activeProject?.dependencies || {})
  }), [activeProject?._id]); // only recompute when project changes

  const loadProject = async (id, retries = 10, delay = 300) => {
    setIsLoading(true);
    try {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(`/api/projects/${id}`);
          if (response.ok) {
            const fullProject = await response.json();
            // Store raw files from the server — normalization happens in
            // the sandpackFiles useMemo so it only runs once, not twice.
            setActiveProject(fullProject);
            localStorage.setItem('active_project_id', id);

            if (fullProject.activeFile) {
              setOpenTabs([fullProject.activeFile]);
            } else {
              setOpenTabs(['/src/App.jsx']);
            }
            return;
          }
        } catch (err) {
          if (i === retries - 1) {
            console.error('Failed to load project:', err);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (name) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        const newProj = await response.json();
        setProjects(prev => [
          {
            _id: newProj._id,
            name: newProj.name,
            createdAt: newProj.createdAt,
            updatedAt: newProj.updatedAt
          },
          ...prev
        ]);
        setActiveProject(newProj);
        localStorage.setItem('active_project_id', newProj._id);
        setOpenTabs(['/src/App.jsx']);
        setActivePanel('explorer'); // Shift panel back to explorer
      }
    } catch (err) {
      console.error('Create project failed:', err);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedProjects = projects.filter(p => p._id !== id);
        setProjects(updatedProjects);

        // If we deleted our current active project
        if (activeProject && activeProject._id === id) {
          if (updatedProjects.length > 0) {
            await loadProject(updatedProjects[0]._id);
          } else {
            // Re-create default one if empty
            await handleCreateProject('My Sandbox Project');
          }
        }
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  if (isLoading || !activeProject) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-secondary)',
        gap: '1rem',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(56,189,248,0.1)',
          borderTopColor: 'var(--secondary)',
          borderRadius: '50%',
          animation: 'spin-animation 1s linear infinite'
        }} />
        <span>Bootstrapping Developer Sandbox...</span>
        <style>{`
          @keyframes spin-animation {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ide-container">
      {/* 1. Top Header Bar */}
      <header className="ide-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)'
          }}>
            <Code2 size={16} color="white" />
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: '800', tracking: '0.05em', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            EVOC SANDBOX
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            color: 'var(--secondary)',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            IDE Core
          </span>
        </div>

        {/* Project Name Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Session:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{activeProject.name}</span>
        </div>

        {/* Brand visual decorations */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
          </div>
        </div>
      </header>

      {/* Workspace panel */}
      <div className="ide-workspace">
        {/* 1. Left Sidebar vertical icons */}
        <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />

        {/* Sandpack Provider wraps active workspace files and configurations */}
        <SandpackProvider
          key={activeProject._id}
          template="react"
          theme="dark"
          files={sandpackFiles}
          customSetup={{
            dependencies: sandpackDeps
          }}
          options={{
            activeFile: '/App.js',
            visibleFiles: ['/App.js', '/styles.css', '/package.json'],
            autorun: true,
            recompileMode: 'immediate',
            recompileDelay: 0
          }}
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
            height: '100%',
            width: '100%'
          }}
        >
          <SandboxWorkspace
            activeProject={activeProject}
            dbMode={dbMode}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            projects={projects}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onSelectProject={loadProject}
            openTabs={openTabs}
            setOpenTabs={setOpenTabs}
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            setProjects={setProjects}
            setActiveProject={setActiveProject}
          />
        </SandpackProvider>
      </div>
    </div>
  );
}
