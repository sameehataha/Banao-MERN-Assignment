import React, { useState } from 'react';
import { Database, Plus, Trash2, FolderOpen, Calendar } from 'lucide-react';

export default function ProjectList({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    await onCreateProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreating(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* Create New Project */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Create New Project
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g. My React App"
            disabled={isCreating}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', minWidth: '60px', justifyContent: 'center' }}
            disabled={isCreating || !newProjectName.trim()}
          >
            {isCreating ? '...' : <Plus size={16} />}
          </button>
        </div>
      </form>

      {/* Projects List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
          Saved Sessions ({projects.length})
        </span>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px'
        }}>
          {projects.length === 0 ? (
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Database size={24} style={{ opacity: 0.4 }} />
              No saved projects yet. Create one above!
            </div>
          ) : (
            projects.map(project => {
              const isActive = project._id === activeProjectId;
              return (
                <div
                  key={project._id}
                  onClick={() => !isActive && onSelectProject(project._id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid var(--border-color)',
                    cursor: isActive ? 'default' : 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                  className="project-item-card"
                >
                  {/* Project Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: isActive ? 'var(--secondary)' : 'var(--text-primary)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      maxWidth: '80%'
                    }}>
                      {project.name}
                    </span>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                          onDeleteProject(project._id);
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
                      className="project-delete-btn"
                      title="Delete Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Calendar size={10} />
                    <span>Updated: {formatDate(project.updatedAt)}</span>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      color: 'var(--success)',
                      fontWeight: '600'
                    }}>
                      <FolderOpen size={10} />
                      Active
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .project-item-card:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .project-item-card:hover .project-delete-btn {
          opacity: 1 !important;
        }
        .project-delete-btn:hover {
          color: var(--error) !important;
        }
      `}</style>
    </div>
  );
}
