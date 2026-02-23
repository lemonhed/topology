import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useOpenAIRealtime } from './hooks/useOpenAIRealtime'
import { useWorkflow } from './hooks/useWorkflow'
import { useArchitectureAnalysis } from './hooks/useArchitectureAnalysis'
import { DatabaseShapeUtil } from './components/ui/DatabaseShape'
import { ServerShapeUtil } from './components/ui/ServerShape'
import { UserShapeUtil } from './components/ui/UserShape'
import { LLMShapeUtil } from './components/ui/LLMShape'
import { FrontendShapeUtil } from './components/ui/FrontendShape'
import { GPTRealtimeShapeUtil } from './components/ui/GPTRealtimeShape'
import { SuggestionsPopup } from './components/SuggestionsPopup'
import { WorkflowToolbar } from './components/WorkflowToolbar'
import { DocumentationView } from './components/DocumentationView'
import { WorkflowPicker } from './components/WorkflowPicker'
import { TranscriptInput } from './components/TranscriptInput'
import { useRef, useCallback, useState, useEffect } from 'react'
import { ApiKeyModal } from './components/ApiKeyModal'
import { InfoPopup } from './components/InfoPopup'
import { hasSavedKey } from './lib/secureStorage'
import { saveWorkflow, listWorkflows } from './lib/workflowStorage'
import type { Workflow } from './types/workflow'

/** Re-render a loaded workflow's participants & steps onto the tldraw canvas */
function renderWorkflowToCanvas(workflow: Workflow, editor: any) {
  // Draw participants as person shapes across the top
  workflow.participants.forEach((p, i) => {
    const x = 200 + i * 300
    const y = 50
    editor.createShapes([{
      id: `shape:participant_${p.id}`,
      type: 'user',
      x,
      y,
      props: { w: 120, h: 140, color: p.type === 'external' ? 'orange' : 'blue' },
    }])
    editor.createShapes([{
      id: `shape:label_participant_${p.id}`,
      type: 'text',
      x: x + 10,
      y: y + 150,
      props: { text: `${p.name}\n(${p.role})`, size: 's', color: 'black' },
    }])
  })

  // Track step positions for drawing flows
  const stepPositions: Record<string, { x: number; y: number; h: number }> = {}

  // Draw steps as geo shapes in their actor's column
  workflow.steps.forEach((step, i) => {
    const actorIndex = workflow.participants.findIndex((p) => p.id === step.actor)
    const x = 200 + Math.max(actorIndex, 0) * 300
    const y = 300 + i * 180
    const w = 200
    const h = step.type === 'decision' ? 100 : 80

    const uuid = step.id.replace('step_', '')
    const shapeId = `shape:step_${uuid}`
    stepPositions[step.id] = { x: x + w / 2, y, h }

    editor.createShapes([{
      id: shapeId,
      type: 'geo',
      x,
      y,
      props: {
        w,
        h,
        geo: step.type === 'decision' ? 'diamond' : 'rectangle',
        text: step.action,
        size: 's',
        color: step.type === 'decision' ? 'orange' : 'blue',
        fill: 'semi',
      },
    }])
  })

  // Draw flows as arrows between steps
  workflow.flows.forEach((flow) => {
    const from = stepPositions[flow.from]
    const to = stepPositions[flow.to]
    if (!from || !to) return

    const fromUuid = flow.from.replace('step_', '')
    const toUuid = flow.to.replace('step_', '')
    const arrowId = `shape:flow_${fromUuid}_${toUuid}`

    editor.createShapes([{
      id: arrowId,
      type: 'arrow',
      props: {
        start: { x: from.x, y: from.y + from.h },
        end: { x: to.x, y: to.y },
        bend: 0,
        color: 'black',
        size: 'm',
      },
    }])

    if (flow.condition) {
      editor.createShapes([{
        id: `shape:flowlabel_${fromUuid}_${toUuid}`,
        type: 'text',
        x: (from.x + to.x) / 2 + 10,
        y: (from.y + from.h + to.y) / 2 - 10,
        props: { text: flow.condition, size: 's', color: 'grey' },
      }])
    }
  })
}

export default function Whiteboard() {
  const {
    isRealtimeConnected,
    isRealtimeConnecting,
    isMuted,
    error: realtimeError,
    connectRealtime,
    disconnectRealtime,
    toggleMute,
    setEditor: setEditorOpenAI,
    setWorkflowActions,
  } = useOpenAIRealtime()

  const workflowHook = useWorkflow()
  const editorRef = useRef<any>(null)

  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(true)
  const [savedKeyExists] = useState(() => hasSavedKey())
  const [activeView, setActiveView] = useState<'whiteboard' | 'documentation'>('whiteboard')
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false)
  const [showTranscriptInput, setShowTranscriptInput] = useState(false)
  // Track mute state before switching to docs so we can restore it
  const wasMutedBeforeDocsRef = useRef(false)

  const architectureAnalysis = useArchitectureAnalysis(apiKey ?? '')

  // Add state to track if initial analysis has been done
  const [hasRunInitialAnalysis, setHasRunInitialAnalysis] = useState(false)

  // Pass workflow actions to realtime hook whenever they change
  useEffect(() => {
    setWorkflowActions(workflowHook)
  }, [workflowHook, setWorkflowActions])

  // Auto-save workflow on beforeunload (tab close / navigate away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const wf = workflowHook.getWorkflow()
      // Only auto-save if there's meaningful content
      if (wf.participants.length > 0 || wf.steps.length > 0) {
        saveWorkflow(wf)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [workflowHook])

  // Load a saved workflow — bump version if reopening
  const handleLoadWorkflow = useCallback((wf: Workflow) => {
    // Bump minor version for a new session on an existing workflow
    const parts = wf.version.split('.')
    const major = parts[0] || '1'
    const minor = parseInt(parts[1] || '0', 10) + 1
    const newVersion = `${major}.${minor}`

    const today = new Date().toISOString().split('T')[0]
    const updated: Workflow = {
      ...wf,
      version: newVersion,
      lastModified: today,
      metadata: {
        ...wf.metadata,
        sessionDate: today,
      },
      versionHistory: [
        ...(wf.versionHistory || []),
        {
          version: newVersion,
          date: today,
          changes: 'Continued session',
          session: wf.metadata.sessionWith || 'Follow-up session',
        },
      ],
    }

    workflowHook.loadWorkflow(updated)
    setShowWorkflowPicker(false)

    // Clear canvas and re-render from workflow data
    const editor = editorRef.current
    if (editor) {
      // Clear existing shapes
      const allShapes = editor.getCurrentPageShapes()
      if (allShapes.length > 0) {
        editor.deleteShapes(allShapes.map((s: any) => s.id))
      }
      // Re-render participants and steps on canvas
      renderWorkflowToCanvas(updated, editor)
    }
  }, [workflowHook])

  const handleCreateNewWorkflow = useCallback(() => {
    workflowHook.resetWorkflow()
    setShowWorkflowPicker(false)
    // Clear canvas
    const editor = editorRef.current
    if (editor) {
      const allShapes = editor.getCurrentPageShapes()
      if (allShapes.length > 0) {
        editor.deleteShapes(allShapes.map((s: any) => s.id))
      }
    }
  }, [workflowHook])

  // Handle completed transcript processing
  const handleTranscriptResult = useCallback((workflow: Workflow) => {
    // Reset current workflow state
    workflowHook.resetWorkflow()

    // Clear existing canvas shapes
    const editor = editorRef.current
    if (editor) {
      const allShapes = editor.getCurrentPageShapes()
      if (allShapes.length > 0) {
        editor.deleteShapes(allShapes.map((s: any) => s.id))
      }
    }

    // Load the new workflow into state
    workflowHook.loadWorkflow(workflow)

    // Render the workflow on the canvas
    if (editor) {
      renderWorkflowToCanvas(workflow, editor)
    }

    // Auto-save
    saveWorkflow(workflow)

    // Close modal and ensure whiteboard view
    setShowTranscriptInput(false)
    if (activeView !== 'whiteboard') {
      setActiveView('whiteboard')
    }
  }, [workflowHook, activeView])

  const handleApiKeySubmit = useCallback(async (submittedApiKey: string) => {
    setApiKey(submittedApiKey)
    await connectRealtime(submittedApiKey)
    setShowApiKeyModal(false)
  }, [connectRealtime])

  // View toggle — mute when switching to docs, unmute when switching back
  const handleToggleView = useCallback(() => {
    if (activeView === 'whiteboard') {
      // Switching TO documentation
      if (isRealtimeConnected && !isMuted) {
        wasMutedBeforeDocsRef.current = false
        toggleMute() // mute while viewing docs
      } else {
        wasMutedBeforeDocsRef.current = isMuted
      }
      setActiveView('documentation')
    } else {
      // Switching BACK to whiteboard
      if (isRealtimeConnected && !wasMutedBeforeDocsRef.current) {
        toggleMute() // unmute
      }
      setActiveView('whiteboard')
    }
  }, [activeView, isRealtimeConnected, isMuted, toggleMute])

  // Auto-save on disconnect
  const handleDisconnect = useCallback(() => {
    const wf = workflowHook.getWorkflow()
    if (wf.participants.length > 0 || wf.steps.length > 0) {
      saveWorkflow(wf)
    }
    disconnectRealtime()
  }, [workflowHook, disconnectRealtime])

  const handleAcceptSuggestion = useCallback((suggestion: any) => {
    const editor = editorRef.current
    if (!editor) return

    // Geometry helpers (same as in useOpenAIRealtime)
    const centerOf = (s: any) => ({
      x: (s.x ?? 0) + ((s.props?.w ?? 0) / 2),
      y: (s.y ?? 0) + ((s.props?.h ?? 0) / 2),
    })

    const edgePointRect = (center: { x: number; y: number }, halfW: number, halfH: number, toward: { x: number; y: number }) => {
      const dx = toward.x - center.x
      const dy = toward.y - center.y
      if (dx === 0 && dy === 0) return { x: center.x, y: center.y }
      const tx = halfW / Math.abs(dx || 1e-9)
      const ty = halfH / Math.abs(dy || 1e-9)
      const t = Math.min(tx, ty)
      return { x: center.x + dx * t, y: center.y + dy * t }
    }

    const edgePointEllipse = (center: { x: number; y: number }, halfW: number, halfH: number, toward: { x: number; y: number }) => {
      const dx = toward.x - center.x
      const dy = toward.y - center.y
      if (dx === 0 && dy === 0) return { x: center.x, y: center.y }
      const scale = 1 / Math.sqrt((dx * dx) / (halfW * halfW || 1e-9) + (dy * dy) / (halfH * halfH || 1e-9))
      return { x: center.x + dx * scale, y: center.y + dy * scale }
    }

    const edgePoint = (s: any, toward: { x: number; y: number }) => {
      const c = centerOf(s)
      const hw = (s.props?.w ?? 0) / 2
      const hh = (s.props?.h ?? 0) / 2

      const shapeType = s.type
      if (shapeType === 'server' || shapeType === 'gpt_realtime') {
        return edgePointRect(c, hw, hh, toward)
      } else if (shapeType === 'database' || shapeType === 'user' || shapeType === 'llm' || shapeType === 'frontend') {
        return edgePointEllipse(c, hw, hh, toward)
      }
      return c
    }

    const uuid = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const shapeId = `shape:${uuid}`

    // Map suggestion component types to shape types
    const shapeTypeMap = {
      'database': 'database',
      'person': 'user',
      'server': 'server',
      'gpt_5': 'llm',
      'frontend': 'frontend',
      'gpt_realtime': 'gpt_realtime',
    }

    const shape = {
      id: shapeId,
      type: shapeTypeMap[suggestion.component_type as keyof typeof shapeTypeMap] || 'server',
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      props: {
        w: suggestion.component_type === 'person' ? 120 : suggestion.component_type === 'database' ? 160 : suggestion.component_type === 'gpt_5' ? 200 : suggestion.component_type === 'frontend' ? 180 : suggestion.component_type === 'gpt_realtime' ? 220 : 240,
        h: suggestion.component_type === 'person' ? 140 : suggestion.component_type === 'database' ? 200 : suggestion.component_type === 'gpt_5' ? 160 : suggestion.component_type === 'frontend' ? 140 : suggestion.component_type === 'gpt_realtime' ? 120 : 160,
        color: suggestion.component_type === 'database' ? 'green' : suggestion.component_type === 'person' ? 'blue' : suggestion.component_type === 'server' ? 'gray' : suggestion.component_type === 'frontend' ? 'red' : suggestion.component_type === 'gpt_realtime' ? 'blue' : 'purple',
      },
    }

    editor.createShapes([shape])

    // Create connections if suggested
    if (suggestion.connections && suggestion.connections.length > 0) {
      const newShape = editor.getShape(shapeId)

      suggestion.connections.forEach((connection: any) => {
        const targetShapeId = `shape:${connection.to_component_id}`
        const targetShape = editor.getShape(targetShapeId)

        if (targetShape && newShape) {
          let fromShape, toShape, fromUuid, toUuid
          if (connection.direction === 'to') {
            fromShape = newShape
            toShape = targetShape
            fromUuid = uuid
            toUuid = connection.to_component_id
          } else if (connection.direction === 'from') {
            fromShape = targetShape
            toShape = newShape
            fromUuid = connection.to_component_id
            toUuid = uuid
          } else {
            fromShape = newShape
            toShape = targetShape
            fromUuid = uuid
            toUuid = connection.to_component_id
          }

          const ca = centerOf(fromShape)
          const cb = centerOf(toShape)
          const start = edgePoint(fromShape, cb)
          const end = edgePoint(toShape, ca)

          const arrowId = `shape:connection_${fromUuid}_${toUuid}`

          editor.createShapes([{
            id: arrowId,
            type: 'arrow',
            props: {
              start,
              end,
              bend: 0,
              color: 'black',
              size: 'm',
            },
          }])

          editor.createBindings([
            {
              id: `binding:${arrowId}_start`,
              type: 'arrow',
              fromId: arrowId,
              toId: fromShape.id,
              props: {
                terminal: 'start',
                isPrecise: false,
                isExact: false,
                normalizedAnchor: { x: 0.5, y: 0.5 }
              }
            },
            {
              id: `binding:${arrowId}_end`,
              type: 'arrow',
              fromId: arrowId,
              toId: toShape.id,
              props: {
                terminal: 'end',
                isPrecise: false,
                isExact: false,
                normalizedAnchor: { x: 0.5, y: 0.5 }
              }
            }
          ])

          console.log(`Created sticky connection: ${connection.description}`)
        } else {
          console.warn(`Target shape not found: ${targetShapeId}`)
        }
      })
    }

    architectureAnalysis.dismissSuggestion(suggestion.id)
    console.log('Running analysis after component addition')
    architectureAnalysis.startOrResetAnalysisTimer()
  }, [architectureAnalysis])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {showApiKeyModal && (
        <ApiKeyModal
          onApiKeySubmit={handleApiKeySubmit}
          isLoading={isRealtimeConnecting}
          error={realtimeError}
          hasSavedApiKey={savedKeyExists}
        />
      )}

      {/* Workflow Picker modal */}
      {showWorkflowPicker && (
        <WorkflowPicker
          onSelect={handleLoadWorkflow}
          onCreateNew={handleCreateNewWorkflow}
          onClose={() => setShowWorkflowPicker(false)}
        />
      )}

      {/* Transcript Input modal */}
      {showTranscriptInput && apiKey && (
        <TranscriptInput
          apiKey={apiKey}
          onWorkflowReady={handleTranscriptResult}
          onClose={() => setShowTranscriptInput(false)}
        />
      )}

      {/* Workflow Toolbar — always visible */}
      <WorkflowToolbar
        workflow={workflowHook.workflow}
        activeView={activeView}
        onToggleView={handleToggleView}
        onWorkflowNameChange={workflowHook.setWorkflowName}
        isConnected={isRealtimeConnected}
        isMuted={isMuted}
        onOpenPicker={() => setShowWorkflowPicker(true)}
        hasSavedWorkflows={listWorkflows().length > 0}
        onImportTranscript={() => setShowTranscriptInput(true)}
      />

      {/* Documentation View */}
      {activeView === 'documentation' && (
        <DocumentationView
          workflow={workflowHook.workflow}
          onBack={handleToggleView}
          onUpdateNotes={(notes) => workflowHook.updateMetadata({ notes })}
          onUpdateSessionWith={(sessionWith) => workflowHook.updateMetadata({ sessionWith })}
        />
      )}

      {/* Whiteboard View — hidden (not unmounted) when in docs view */}
      <div style={{ display: activeView === 'whiteboard' ? 'block' : 'none', width: '100%', height: '100%' }}>
        {/* Status Bar */}
        <div style={{
          position: 'absolute',
          bottom: 150,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={isRealtimeConnected ? handleDisconnect : () => setShowApiKeyModal(true)}
              disabled={isRealtimeConnecting}
              style={{
                background: isRealtimeConnected ? '#ff4444' : '#4a7dff',
                opacity: isRealtimeConnecting ? 0.7 : 1,
                border: 'none',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: isRealtimeConnecting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
              }}
            >
              {isRealtimeConnected ? 'Disconnect' : (isRealtimeConnecting ? 'Connecting...' : 'Connect')}
            </button>
            <button
              onClick={toggleMute}
              disabled={!isRealtimeConnected}
              style={{
                background: isMuted ? '#888' : '#222',
                border: 'none',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: !isRealtimeConnected ? 'not-allowed' : 'pointer',
                fontSize: '16px',
              }}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <span style={{ color: isRealtimeConnected ? 'green' : 'red' }}>
              {isRealtimeConnected ? (isMuted ? 'Muted' : 'Unmuted') : 'Idle'}
            </span>
          </div>
          {realtimeError && !showApiKeyModal ? (
            <span style={{ color: '#cc0000' }}>{realtimeError}</span>
          ) : null}
        </div>

        <InfoPopup />

        {/* tldraw Canvas */}
        <Tldraw
          shapeUtils={[DatabaseShapeUtil, ServerShapeUtil, UserShapeUtil, LLMShapeUtil, FrontendShapeUtil, GPTRealtimeShapeUtil]}
          onMount={(editor) => {
            setEditorOpenAI(editor)
            editorRef.current = editor
            architectureAnalysis.setEditor(editor)
            console.log('tldraw editor mounted, setting up shape change listener...')

            editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
              console.log('New shape created:', shape.type, shape.id)

              if (['database', 'user', 'server', 'llm', 'frontend', 'gpt_realtime'].includes(shape.type)) {
                console.log('Component added, queuing analysis in 10 seconds...')
                architectureAnalysis.startOrResetAnalysisTimer()
              }
            })

            setTimeout(() => {
              const shapes = editor.getCurrentPageShapes()
              console.log('Editor mounted, shapes:', shapes?.length || 0)
              if (shapes && shapes.length > 0 && apiKey && !hasRunInitialAnalysis) {
                console.log('Triggering initial analysis from onMount')
                architectureAnalysis.startOrResetAnalysisTimer()
                setHasRunInitialAnalysis(true)
              }
            }, 1000)
          }}
        />

        {/* Architecture Suggestions Popup */}
        <SuggestionsPopup
          suggestions={architectureAnalysis.suggestions}
          isAnalyzing={architectureAnalysis.isAnalyzing}
          error={architectureAnalysis.error}
          onDismiss={architectureAnalysis.dismissSuggestion}
          onClearAll={architectureAnalysis.clearSuggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          lastAnalysis={architectureAnalysis.lastAnalysis}
        />
      </div>
    </div>
  )
}
