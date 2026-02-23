import { useState, useCallback } from 'react'
import { processTranscript } from '../lib/transcriptProcessor'
import type { Workflow } from '../types/workflow'

interface TranscriptInputProps {
  apiKey: string
  onWorkflowReady: (workflow: Workflow) => void
  onClose: () => void
}

type ProcessingState = 'idle' | 'analyzing' | 'building' | 'complete' | 'error'

export function TranscriptInput({ apiKey, onWorkflowReady, onClose }: TranscriptInputProps) {
  const [transcript, setTranscript] = useState('')
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleProcess = useCallback(async () => {
    if (!transcript.trim()) return

    setProcessingState('analyzing')
    setStatusMessage('Sending transcript to AI...')
    setErrorMessage(null)

    try {
      const workflow = await processTranscript(
        transcript.trim(),
        apiKey,
        (status, detail) => {
          if (status.toLowerCase().includes('complete')) {
            setProcessingState('complete')
          } else if (status.toLowerCase().includes('building')) {
            setProcessingState('building')
          } else {
            setProcessingState('analyzing')
          }
          setStatusMessage(detail ? `${status} ${detail}` : status)
        },
      )

      setProcessingState('complete')
      setStatusMessage(
        `Done! ${workflow.participants.length} participants, ${workflow.steps.length} steps, ${workflow.flows.length} flows`,
      )

      // Brief delay so user sees the success message
      setTimeout(() => {
        onWorkflowReady(workflow)
      }, 800)
    } catch (err: unknown) {
      setProcessingState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to process transcript')
    }
  }, [transcript, apiKey, onWorkflowReady])

  const handleRetry = useCallback(() => {
    setProcessingState('idle')
    setErrorMessage(null)
    setStatusMessage('')
  }, [])

  const isProcessing = processingState === 'analyzing' || processingState === 'building'

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Import Transcript</h2>
          <button onClick={onClose} style={styles.closeBtn} disabled={isProcessing}>
            &times;
          </button>
        </div>

        <p style={styles.description}>
          Paste a meeting transcript, call notes, or interview text below.
          The AI will extract participants, process steps, and flows to build a workflow diagram.
        </p>

        {/* Textarea */}
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={`Paste your transcript here...\n\nExample formats:\n- Speaker-labeled: 'John: We start by reviewing the order...'\n- Timestamped: '[00:05:23] Sarah: Then we validate the inventory...'\n- Bullet notes: '- Customer submits order request'`}
          style={styles.textarea}
          disabled={isProcessing}
        />

        {/* Character count */}
        <div style={styles.charCount}>
          {transcript.length.toLocaleString()} characters
        </div>

        {/* Status / Progress */}
        {processingState !== 'idle' && (
          <div
            style={{
              ...styles.statusBar,
              background:
                processingState === 'error'
                  ? '#fef2f2'
                  : processingState === 'complete'
                    ? '#f0fdf4'
                    : '#eff6ff',
              borderColor:
                processingState === 'error'
                  ? '#fecaca'
                  : processingState === 'complete'
                    ? '#bbf7d0'
                    : '#bfdbfe',
            }}
          >
            <span
              style={{
                ...styles.statusDot,
                background:
                  processingState === 'error'
                    ? '#ef4444'
                    : processingState === 'complete'
                      ? '#22c55e'
                      : '#4a7dff',
              }}
            />
            <span style={styles.statusText}>{errorMessage || statusMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {processingState === 'error' ? (
            <>
              <button onClick={handleRetry} style={styles.retryBtn}>
                Try Again
              </button>
              <button onClick={onClose} style={styles.cancelBtn}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleProcess}
                disabled={!transcript.trim() || isProcessing}
                style={{
                  ...styles.processBtn,
                  opacity: !transcript.trim() || isProcessing ? 0.6 : 1,
                  cursor: !transcript.trim() || isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Processing...' : 'Build Workflow'}
              </button>
              <button onClick={onClose} disabled={isProcessing} style={styles.cancelBtn}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Styles (inline, matching existing modal patterns) ──────────────────

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2500,
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
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
  description: {
    margin: '0 0 1rem',
    fontSize: '0.9rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  textarea: {
    width: '100%',
    minHeight: '240px',
    maxHeight: '400px',
    padding: '12px 14px',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    outline: 'none',
    lineHeight: 1.5,
  },
  charCount: {
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'right' as const,
    marginTop: '4px',
    marginBottom: '12px',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '16px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '13px',
    color: '#374151',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  processBtn: {
    background: '#4a7dff',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  cancelBtn: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  retryBtn: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
