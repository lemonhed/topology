import { useState, useEffect, useRef } from 'react'

interface RealtimeState {
  isConnected: boolean
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  sendTestCommand: (command: any) => void
  setEditor: (editor: any) => void
}

export function useRealtime(): RealtimeState {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const editorRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      console.log('Received:', event.data)
      
      try {
        const command = JSON.parse(event.data)
        handleDrawingCommand(command)
      } catch (error) {
        console.log('Non-JSON message:', event.data)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // TODO: Send audio data to backend
          // For now, just log
          console.log('Audio chunk:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
    }
  }

  const handleDrawingCommand = (command: any) => {
    const editor = editorRef.current
    if (!editor) {
      console.log('Editor not ready, queuing command:', command)
      return
    }

    console.log('Handling drawing command:', command)
    
    switch (command.type) {
      case 'draw_item':
        if (command.shape) {
          editor.createShapes([command.shape])
          console.log('Drew shape:', command.shape.id)
        }
        break
      case 'remove_item':
        if (command.shapeId) {
          editor.deleteShapes([command.shapeId])
          console.log('Removed shape:', command.shapeId)
        }
        break
      case 'connect_items': {
        const fromId: string | undefined = command.fromId
        const toId: string | undefined = command.toId
        if (!fromId || !toId) return

        const a = editor.getShape?.(`shape:${fromId}`)
        const b = editor.getShape?.(`shape:${toId}`)
        if (!a || !b) {
          console.warn('connect_items: missing shapes on canvas', { fromId, toId })
          return
        }

        // Helpers
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
          const geo = s.props?.geo
          if (geo === 'rectangle') return edgePointRect(c, hw, hh, toward)
          if (geo === 'ellipse') return edgePointEllipse(c, hw, hh, toward)
          // Fallback: center
          return c
        }

        const ca = centerOf(a)
        const cb = centerOf(b)
        const start = edgePoint(a, cb)
        const end = edgePoint(b, ca)

        const arrowId = `shape:connection_${fromId}_${toId}`
        editor.createShapes([
          {
            id: arrowId,
            type: 'arrow',
            props: {
              start,
              end,
              bend: 0,
              color: 'black',
              size: 'm',
            },
          },
        ])
        console.log('Drew connection:', arrowId)
        break
      }
      default:
        console.log('Unknown command type:', command.type)
    }
  }

  const sendTestCommand = (command: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command))
    }
  }

  const setEditor = (editor: any) => {
    editorRef.current = editor
    console.log('Editor set in ref:', !!editor)
  }

  return {
    isConnected,
    isRecording,
    startRecording,
    stopRecording,
    sendTestCommand,
    setEditor
  }
}
