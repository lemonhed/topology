import React, { useMemo, useState } from 'react'
import type { Workflow } from '../types/workflow'
import { generateMarkdown } from '../lib/markdownGenerator'

interface DocumentationViewProps {
  workflow: Workflow
  onBack: () => void
  onUpdateNotes: (notes: string[]) => void
  onUpdateSessionWith: (sessionWith: string) => void
}

export function DocumentationView({
  workflow,
  onBack,
  onUpdateNotes,
  onUpdateSessionWith,
}: DocumentationViewProps) {
  const markdown = useMemo(() => generateMarkdown(workflow), [workflow])
  const [newNote, setNewNote] = useState('')
  const [editingSessionWith, setEditingSessionWith] = useState(false)
  const [sessionWithValue, setSessionWithValue] = useState(workflow.metadata.sessionWith)

  const handleAddNote = () => {
    if (!newNote.trim()) return
    onUpdateNotes([...workflow.metadata.notes, newNote.trim()])
    setNewNote('')
  }

  const handleRemoveNote = (index: number) => {
    const updated = workflow.metadata.notes.filter((_, i) => i !== index)
    onUpdateNotes(updated)
  }

  const handleSessionWithSave = () => {
    onUpdateSessionWith(sessionWithValue)
    setEditingSessionWith(false)
  }

  const handleExportMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(workflow.name)}_v${workflow.version}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(workflow.name)}_v${workflow.version}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          &#8592; Back to Whiteboard
        </button>
        <div style={styles.headerActions}>
          <button onClick={handleExportMarkdown} style={styles.exportBtn}>
            Export Markdown
          </button>
          <button onClick={handleExportJSON} style={styles.exportBtn}>
            Export JSON
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Main documentation */}
        <div style={styles.docPanel}>
          <div style={styles.markdownContent}>
            <SimpleMarkdownRenderer markdown={markdown} />
          </div>
        </div>

        {/* Side panel: editable metadata */}
        <div style={styles.sidePanel}>
          <h3 style={styles.sidePanelTitle}>Session Details</h3>

          {/* Session with */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Session With</label>
            {editingSessionWith ? (
              <div style={styles.inlineEdit}>
                <input
                  value={sessionWithValue}
                  onChange={(e) => setSessionWithValue(e.target.value)}
                  onBlur={handleSessionWithSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleSessionWithSave()}
                  style={styles.input}
                  autoFocus
                  placeholder="e.g., Acme Corp"
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingSessionWith(true)}
                style={styles.editableField}
              >
                {workflow.metadata.sessionWith || 'Click to set...'}
              </button>
            )}
          </div>

          {/* Date */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Session Date</label>
            <span style={styles.fieldValue}>{workflow.metadata.sessionDate}</span>
          </div>

          {/* Notes */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Notes</label>
            {workflow.metadata.notes.map((note, i) => (
              <div key={i} style={styles.noteItem}>
                <span style={styles.noteText}>{note}</span>
                <button
                  onClick={() => handleRemoveNote(i)}
                  style={styles.noteRemove}
                  title="Remove note"
                >
                  &#10005;
                </button>
              </div>
            ))}
            <div style={styles.addNoteRow}>
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..."
                style={styles.input}
              />
              <button onClick={handleAddNote} style={styles.addNoteBtn}>
                +
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Summary</label>
            <div style={styles.statsList}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{workflow.participants.length}</span>
                <span style={styles.statLabel}>Participants</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{workflow.steps.length}</span>
                <span style={styles.statLabel}>Steps</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{workflow.flows.length}</span>
                <span style={styles.statLabel}>Flows</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>
                  {workflow.steps.filter((s) => s.type === 'decision').length}
                </span>
                <span style={styles.statLabel}>Decisions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal markdown-to-JSX renderer. Handles: headers, tables, bold, lists, horizontal rules.
 * No external dependencies.
 */
function SimpleMarkdownRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontSize: '1rem', fontWeight: 600, margin: '1.2rem 0 0.4rem', color: '#1f2937' }}>{renderInline(line.slice(4))}</h3>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontSize: '1.25rem', fontWeight: 600, margin: '1.5rem 0 0.5rem', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.3rem' }}>{renderInline(line.slice(3))}</h2>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>{renderInline(line.slice(2))}</h1>)
      i++; continue
    }

    // Table (detect by |)
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1]?.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      elements.push(renderTable(tableLines, elements.length))
      continue
    }

    // List items
    if (line.startsWith('- ')) {
      const listItems: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        listItems.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={elements.length} style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ marginBottom: '0.25rem', color: '#374151', lineHeight: 1.5 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // HR
    if (line.trim() === '---') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1rem 0' }} />)
      i++; continue
    }

    // Empty line
    if (line.trim() === '') {
      i++; continue
    }

    // Paragraph
    elements.push(<p key={i} style={{ margin: '0.4rem 0', color: '#374151', lineHeight: 1.6 }}>{renderInline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function renderTable(lines: string[], key: number): React.ReactNode {
  const headerCells = lines[0].split('|').filter((c) => c.trim())
  // Skip separator line (line 1), rest are body rows
  const bodyRows = lines.slice(2).map((line) =>
    line.split('|').filter((c) => c.trim())
  )

  return (
    <table key={key} style={{ width: '100%', borderCollapse: 'collapse', margin: '0.75rem 0', fontSize: '0.9rem' }}>
      <thead>
        <tr>
          {headerCells.map((cell, i) => (
            <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #d1d5db', fontWeight: 600, color: '#111827' }}>
              {cell.trim()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyRows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                {cell.trim()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    inset: 0,
    background: '#f9fafb',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  backButton: {
    background: 'none',
    border: '1px solid #d1d5db',
    color: '#374151',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  exportBtn: {
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    color: '#374151',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  docPanel: {
    flex: 1,
    overflow: 'auto',
    padding: '32px 48px',
  },
  markdownContent: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '12px',
    padding: '40px 48px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
  },
  sidePanel: {
    width: '320px',
    background: 'white',
    borderLeft: '1px solid #e5e7eb',
    padding: '24px',
    overflow: 'auto',
  },
  sidePanelTitle: {
    margin: '0 0 20px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: '6px',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#374151',
  },
  editableField: {
    background: '#f9fafb',
    border: '1px dashed #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
  },
  inlineEdit: {
    display: 'flex',
    gap: '6px',
  },
  input: {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  noteItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  noteText: {
    flex: 1,
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.4,
  },
  noteRemove: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px',
    flexShrink: 0,
  },
  addNoteRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
  addNoteBtn: {
    background: '#4a7dff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  statsList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  statItem: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
  },
}
