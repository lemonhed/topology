import React, { useState, useEffect } from 'react'
import { listWorkflows, loadWorkflow, deleteWorkflow } from '../lib/workflowStorage'
import type { Workflow } from '../types/workflow'

interface WorkflowPickerProps {
  onSelect: (workflow: Workflow) => void
  onCreateNew: () => void
  onClose: () => void
}

export function WorkflowPicker({ onSelect, onCreateNew, onClose }: WorkflowPickerProps) {
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string; lastModified: string }>>([])

  useEffect(() => {
    setWorkflows(listWorkflows())
  }, [])

  const handleLoad = (id: string) => {
    const wf = loadWorkflow(id)
    if (wf) {
      onSelect(wf)
    }
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this workflow? This cannot be undone.')) return
    deleteWorkflow(id)
    setWorkflows(listWorkflows())
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Workflows</h2>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        {/* New workflow button */}
        <button onClick={onCreateNew} style={styles.newBtn}>
          + New Workflow
        </button>

        {/* Saved workflows list */}
        {workflows.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No saved workflows yet.</p>
            <p style={styles.emptyHint}>Start a new session to create one.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {workflows
              .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
              .map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => handleLoad(wf.id)}
                  style={styles.item}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#f3f4f6'
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'white'
                  }}
                >
                  <div style={styles.itemInfo}>
                    <span style={styles.itemName}>{wf.name}</span>
                    <span style={styles.itemDate}>{formatDate(wf.lastModified)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(wf.id, e)}
                    style={styles.deleteBtn}
                    title="Delete workflow"
                  >
                    &#128465;
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 12px',
  },
  title: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  newBtn: {
    margin: '0 24px 16px',
    padding: '12px',
    background: '#4a7dff',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  empty: {
    padding: '32px 24px',
    textAlign: 'center' as const,
  },
  emptyText: {
    margin: '0 0 4px',
    fontSize: '15px',
    color: '#6b7280',
  },
  emptyHint: {
    margin: 0,
    fontSize: '13px',
    color: '#9ca3af',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 12px 16px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    background: 'white',
    marginBottom: '4px',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  itemName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  itemDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    opacity: 0.4,
    transition: 'opacity 0.15s',
  },
}
