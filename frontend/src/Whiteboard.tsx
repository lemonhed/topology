import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useOpenAIRealtime } from './hooks/useOpenAIRealtime'
import { useArchitectureAnalysis } from './hooks/useArchitectureAnalysis'
import { DatabaseShapeUtil } from './components/ui/DatabaseShape'
import { ServerShapeUtil } from './components/ui/ServerShape'
import { UserShapeUtil } from './components/ui/UserShape'
import { LLMShapeUtil } from './components/ui/LLMShape'
import { FrontendShapeUtil } from './components/ui/FrontendShape'
import { GPTRealtimeShapeUtil } from './components/ui/GPTRealtimeShape'
import { SuggestionsPopup } from './components/SuggestionsPopup'
import { useRef, useCallback, useState } from 'react'
import { ApiKeyModal } from './components/ApiKeyModal'
import { InfoPopup } from './components/InfoPopup'

export default function Whiteboard() {
  const { isRealtimeConnected, isRealtimeConnecting, isMuted, error: realtimeError, connectRealtime, disconnectRealtime, toggleMute, setEditor: setEditorOpenAI } = useOpenAIRealtime()
  const editorRef = useRef<any>(null)

  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(true)
  
  const architectureAnalysis = useArchitectureAnalysis(apiKey)

  // Add state to track if initial analysis has been done
  const [hasRunInitialAnalysis, setHasRunInitialAnalysis] = useState(false)

  // Note: Analysis is now triggered by shape creation events in onMount

  const handleApiKeySubmit = useCallback(async (submittedApiKey: string) => {
    setApiKey(submittedApiKey)
    await connectRealtime(submittedApiKey)
    setShowApiKeyModal(false)
  }, [connectRealtime])

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
          // Determine connection direction
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
            // bidirectional - create one connection for now
            fromShape = newShape
            toShape = targetShape
            fromUuid = uuid
            toUuid = connection.to_component_id
          }
          
          // Calculate edge points
          const ca = centerOf(fromShape)
          const cb = centerOf(toShape)
          const start = edgePoint(fromShape, cb)
          const end = edgePoint(toShape, ca)
          
          const arrowId = `shape:connection_${fromUuid}_${toUuid}`
          
          // Create arrow with bindings
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

          // Create bindings to make the arrow stick
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
    
    // Queue a new analysis after adding the component
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
        />
      )}
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
            onClick={isRealtimeConnected ? disconnectRealtime : () => setShowApiKeyModal(true)}
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
          // Provide editor to hooks
          setEditorOpenAI(editor)
          editorRef.current = editor
          architectureAnalysis.setEditor(editor)
          console.log('tldraw editor mounted, setting up shape change listener...')
          
          // Listen for shape changes and trigger analysis when new components are added
          editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
            console.log('🎯 New shape created:', shape.type, shape.id)
            
            // Only trigger analysis for our custom component types, not arrows
            if (['database', 'user', 'server', 'llm', 'frontend', 'gpt_realtime'].includes(shape.type)) {
              console.log('🎯 Component added, queuing analysis in 10 seconds...')
              architectureAnalysis.startOrResetAnalysisTimer()
            }
          })
          
          // Initial analysis if shapes already exist
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
  )
}
