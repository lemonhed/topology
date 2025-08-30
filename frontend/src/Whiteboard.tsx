import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useRealtime } from './hooks/useRealtime'
import { useOpenAIRealtime } from './hooks/useOpenAIRealtime'
import { DatabaseShapeUtil } from './components/ui/DatabaseShape'
import { ServerShapeUtil } from './components/ui/ServerShape'
import { UserShapeUtil } from './components/ui/UserShape'
import { LLMShapeUtil } from './components/ui/LLMShape'
import { useRef, useState } from 'react'

export default function Whiteboard() {
  const { isConnected, isRecording, startRecording, stopRecording, sendTestCommand, setEditor: setEditorRealtime } = useRealtime()
  const { token, setToken, isRealtimeConnected, isRealtimeConnecting, isMuted, error, connectRealtime, disconnectRealtime, toggleMute, setEditor: setEditorOpenAI } = useOpenAIRealtime()
  const editorRef = useRef<any>(null)
  const [fromId, setFromId] = useState('test-db')
  const [toId, setToId] = useState('api-server')

  const testDrawDatabase = async () => {
    try {
      const response = await fetch('http://localhost:8000/test-draw/database/test-db')
      const command = await response.json()
      sendTestCommand(command)
    } catch (error) {
      console.error('Failed to test draw:', error)
    }
  }

  const testDrawServer = async () => {
    try {
      const response = await fetch('http://localhost:8000/test-draw/server/api-server')
      const command = await response.json()
      sendTestCommand(command)
    } catch (error) {
      console.error('Failed to test draw:', error)
    }
  }

  const testDrawLLM = async () => {
    try {
      const response = await fetch('http://localhost:8000/test-draw-llm/chatgpt-model')
      const command = await response.json()
      sendTestCommand(command)
    } catch (error) {
      console.error('Failed to test draw:', error)
    }
  }

  const testConnectItems = async () => {
    // Only connect existing items using their unique names
    const editor = editorRef.current
    if (!editor) return

    const aExists = !!editor.getShape?.(`shape:${fromId}`)
    const bExists = !!editor.getShape?.(`shape:${toId}`)

    if (!aExists || !bExists) {
      console.warn('One or both items do not exist on canvas:', { fromId, toId })
      return
    }

    try {
      const response = await fetch(`http://localhost:8000/test-connect/${fromId}/${toId}`)
      const command = await response.json()
      sendTestCommand(command)
    } catch (error) {
      console.error('Failed to test connect:', error)
    }
  }

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
        <div>
          Connection: <span style={{ color: isConnected ? 'green' : 'red' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
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
            {isRealtimeConnected ? 'Disconnect Realtime' : (isRealtimeConnecting ? 'Connecting...' : 'Connect Realtime')}
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
            {isRealtimeConnected ? (isMuted ? 'Muted' : 'Unmuted') : 'Realtime idle'}
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
        {/* duplicate block removed */}
      </div>

      {/* tldraw Canvas */}
      <Tldraw 
        onMount={(editor) => {
          // Provide editor to hooks
          setEditorRealtime(editor)
          setEditorOpenAI(editor)
          editorRef.current = editor
          console.log('tldraw editor mounted')
        }}
      />
    </div>
  )
}
