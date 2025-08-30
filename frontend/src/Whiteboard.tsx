import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useOpenAIRealtime } from './hooks/useOpenAIRealtime'
import { useArchitectureAnalysis } from './hooks/useArchitectureAnalysis'
import { DatabaseShapeUtil } from './components/ui/DatabaseShape'
import { ServerShapeUtil } from './components/ui/ServerShape'
import { UserShapeUtil } from './components/ui/UserShape'
import { LLMShapeUtil } from './components/ui/LLMShape'
import { SuggestionsPopup } from './components/SuggestionsPopup'
import { useRef, useCallback, useEffect } from 'react'

export default function Whiteboard() {
  const { token, setToken, isRealtimeConnected, isRealtimeConnecting, isMuted, error, connectRealtime, disconnectRealtime, toggleMute, setEditor: setEditorOpenAI } = useOpenAIRealtime()
  const editorRef = useRef<any>(null)

  // Get OpenAI API key from environment variables
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
  const architectureAnalysis = useArchitectureAnalysis(openaiApiKey)

  // Auto-analyze periodically when connected and diagram changes
  useEffect(() => {
    if (editorRef.current) {
      const interval = setInterval(() => {
        const shapes = editorRef.current?.getCurrentPageShapes()
        if (shapes && shapes.length > 0) {
          architectureAnalysis.analyzeDiagram()
        }
      }, 10000) // Analyze every 10 seconds

      return () => clearInterval(interval)
    }
  }, [isRealtimeConnected, token, architectureAnalysis.analyzeDiagram])

  const handleAcceptSuggestion = useCallback((suggestion: any) => {
    const editor = editorRef.current
    if (!editor) return

    const uuid = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`
    const shapeId = `shape:${uuid}`
    
    // Map suggestion component types to shape types
    const shapeTypeMap = {
      'database': 'database',
      'person': 'user', 
      'server': 'server',
      'llm': 'llm'
    }
    
    const shape = {
      id: shapeId,
      type: shapeTypeMap[suggestion.component_type as keyof typeof shapeTypeMap] || 'server',
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      props: {
        w: suggestion.component_type === 'person' ? 60 : suggestion.component_type === 'database' ? 80 : suggestion.component_type === 'llm' ? 100 : 120,
        h: suggestion.component_type === 'person' ? 80 : suggestion.component_type === 'database' ? 100 : 80,
        color: suggestion.component_type === 'database' ? 'green' : suggestion.component_type === 'person' ? 'blue' : suggestion.component_type === 'server' ? 'gray' : 'purple',
      },
    }
    
    editor.createShapes([shape])
    architectureAnalysis.dismissSuggestion(suggestion.id)
    
    // Trigger a new analysis after adding the component
    setTimeout(() => {
      architectureAnalysis.analyzeDiagram()
    }, 1000)
  }, [architectureAnalysis.dismissSuggestion, architectureAnalysis.analyzeDiagram])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Status Bar */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(((e.target as HTMLInputElement).value || '').trim())}
            placeholder="Ephemeral realtime token"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              width: 260
            }}
          />
          <button
            onClick={isRealtimeConnected ? disconnectRealtime : connectRealtime}
            disabled={isRealtimeConnecting || (!isRealtimeConnected && !token)}
            style={{
              background: isRealtimeConnected ? '#ff4444' : '#4a7dff',
              opacity: isRealtimeConnecting ? 0.7 : 1,
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: isRealtimeConnecting ? 'not-allowed' : 'pointer'
            }}
          >
            {isRealtimeConnected ? 'Disconnect Realtime' : (isRealtimeConnecting ? 'Connecting...' : 'Connect')}
          </button>
          <button
            onClick={toggleMute}
            disabled={!isRealtimeConnected}
            style={{
              background: isMuted ? '#888' : '#222',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: !isRealtimeConnected ? 'not-allowed' : 'pointer'
            }}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <span style={{ color: isRealtimeConnected ? 'green' : 'red' }}>
            {isRealtimeConnected ? (isMuted ? 'Muted' : 'Unmuted') : 'Idle'}
          </span>
        </div>
        {error ? (
          <span style={{ color: '#cc0000' }}>{error}</span>
        ) : null}
        
        {/* Test Buttons */}
        <button
          onClick={testDrawDatabase}
          style={{
            background: '#0066cc',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test: Draw Database
        </button>
        
        <button
          onClick={testDrawServer}
          style={{
            background: '#009900',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test: Draw Server
        </button>
        
        <button
          onClick={testDrawLLM}
          style={{
            background: '#6f42c1',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test: Draw LLM
        </button>
        

        <button>/* Connect controls */</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            placeholder="from id (e.g., test-db)"
            style={{ padding: '4px 6px' }}
          />
          <span>→</span>
          <input
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="to id (e.g., api-server)"
            style={{ padding: '4px 6px' }}
          />
          <button
            onClick={testConnectItems}
            style={{
              background: '#cc6600',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test: Connect Items
          </button>
        </div>
        {/* Connect controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            placeholder="from id (e.g., test-db)"
            style={{ padding: '4px 6px' }}
          />
          <span>→</span>
          <input
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="to id (e.g., api-server)"
            style={{ padding: '4px 6px' }}
          />
          <button
            onClick={testConnectItems}
            style={{
              background: '#cc6600',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test: Connect Items
          </button>
        </div>
      </div>

      {/* tldraw Canvas */}
      <Tldraw 
        shapeUtils={[DatabaseShapeUtil, ServerShapeUtil, UserShapeUtil, LLMShapeUtil]}
        onMount={(editor) => {
          // Provide editor to hooks
          setEditorOpenAI(editor)
          editorRef.current = editor
          architectureAnalysis.setEditor(editor)
          console.log('tldraw editor mounted')
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
