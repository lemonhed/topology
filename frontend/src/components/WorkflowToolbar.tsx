import React, { useState } from 'react'
import type { Workflow } from '../types/workflow'
import { generateMarkdown } from '../lib/markdownGenerator'
import { saveWorkflow } from '../lib/workflowStorage'

interface WorkflowToolbarProps {
  workflow: Workflow
  activeView: 'whiteboard' | 'documentation'
  onToggleView: () => void
  onWorkflowNameChange: (name: string) => void
  isConnected: boolean
  isMuted: boolean
  onOpenPicker?: () => void
  hasSavedWorkflows?: boolean
  onImportTranscript?: () => void
}

export function WorkflowToolbar({
  workflow,
  activeView,
  onToggleView,
  onWorkflowNameChange,
  isConnected,
  isMuted,
  onOpenPicker,
  hasSavedWorkflows,
  onImportTranscript,
}: WorkflowToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(workflow.name)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleNameSubmit = () => {
    if (editName.trim()) {
      onWorkflowNameChange(editName.trim())
    }
    setIsEditingName(false)
  }

  const handleSave = () => {
    saveWorkflow(workflow)
    setSaveStatus('Saved!')
    setTimeout(() => setSaveStatus(null), 2000)
  }

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${slugify(workflow.name)}_v${workflow.version}.json`)
    setShowExportMenu(false)
  }

  const handleExportMarkdown = () => {
    const md = generateMarkdown(workflow)
    const blob = new Blob([md], { type: 'text/markdown' })
    downloadBlob(blob, `${slugify(workflow.name)}_v${workflow.version}.md`)
    setShowExportMenu(false)
  }

  return (
    <div style={styles.toolbar}>
      {/* Workflow name */}
      <div style={styles.nameSection}>
        {isEditingName ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            style={styles.nameInput}
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditName(workflow.name); setIsEditingName(true) }}
            style={styles.nameButton}
            title="Click to rename"
          >
            {workflow.name}
          </button>
        )}
        <span style={styles.version}>v{workflow.version}</span>
      </div>

      {/* Status indicator */}
      <div style={styles.statusSection}>
        {isConnected && (
          <span style={{
            ...styles.statusDot,
            background: isMuted ? '#f59e0b' : '#22c55e',
          }} />
        )}
        <span style={styles.statsText}>
          {workflow.participants.length} participants
          {' \u00b7 '}
          {workflow.steps.length} steps
        </span>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {onOpenPicker && (
          <button onClick={onOpenPicker} style={styles.actionBtn} title="Open saved workflow">
            {hasSavedWorkflows ? 'Open' : 'Sessions'}
          </button>
        )}
        {onImportTranscript && (
          <button onClick={onImportTranscript} style={styles.actionBtn} title="Import from transcript">
            Import
          </button>
        )}
        <button onClick={handleSave} style={styles.actionBtn} title="Save workflow">
          {saveStatus || 'Save'}
        </button>

        {/* Export dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            style={styles.actionBtn}
          >
            Export &#9662;
          </button>
          {showExportMenu && (
            <div style={styles.exportMenu}>
              <button onClick={handleExportJSON} style={styles.exportItem}>
                Download JSON
              </button>
              <button onClick={handleExportMarkdown} style={styles.exportItem}>
                Download Markdown
              </button>
            </div>
          )}
        </div>

        {/* View toggle */}
        <button onClick={onToggleView} style={styles.viewToggleBtn}>
          {activeView === 'whiteboard' ? 'View Docs' : 'Back to Whiteboard'}
        </button>
      </div>
    </div>
  )
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const styles: { [key: string]: React.CSSProperties } = {
  toolbar: {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    padding: '8px 16px',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
  },
  nameSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  nameButton: {
    background: 'none',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    color: '#111827',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.15s',
  },
  nameInput: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '4px 8px',
    outline: 'none',
    width: '200px',
  },
  version: {
    fontSize: '11px',
    color: '#9ca3af',
    background: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statsText: {
    color: '#6b7280',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionBtn: {
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    color: '#374151',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background 0.15s',
  },
  viewToggleBtn: {
    background: '#4a7dff',
    border: 'none',
    color: 'white',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  exportMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    zIndex: 1001,
  },
  exportItem: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
  },
}
