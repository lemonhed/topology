import { useCallback, useRef, useState } from 'react'
import { z } from 'zod'
// Use the standalone browser package per the example
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents-realtime'

interface UseOpenAIRealtimeState {
  token: string
  setToken: (value: string) => void
  isRealtimeConnected: boolean
  isRealtimeConnecting: boolean
  isMuted: boolean
  error: string | null
  connectRealtime: () => Promise<void>
  disconnectRealtime: () => void
  toggleMute: () => void
}

export function useOpenAIRealtime(): UseOpenAIRealtimeState {
  const [token, setToken] = useState('')
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isRealtimeConnecting, setIsRealtimeConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agentRef = useRef<RealtimeAgent | null>(null)
  const sessionRef = useRef<RealtimeSession | null>(null)

  const connectRealtime = useCallback(async () => {
    const apiKey = token.trim()
    if (!apiKey) {
      setError('Ephemeral client token is required')
      return
    }
    
    // Basic validation for ephemeral token format
    if (!apiKey.startsWith('ek_') || apiKey.length < 20) {
      setError('Invalid ephemeral token format. Token should start with "ek_" and be generated from OpenAI API.')
      return
    }
    
    if (isRealtimeConnected || isRealtimeConnecting) return

    setIsRealtimeConnecting(true)
    setError(null)
    try {
      // Define an example tool like in the reference
      const getWeather = tool({
        name: 'getWeather',
        description: 'Get the weather for a given city',
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }) => {
          return `The weather in ${city} is sunny`
        }
      })

      const agent = new RealtimeAgent({
        name: 'Assistant',
        instructions: 'You are a helpful assistant.',
        tools: [getWeather]
      });

      const session = new RealtimeSession(agent)

      // Log transport events from the realtime server
      session.on('transport_event', (event: unknown) => {
        // eslint-disable-next-line no-console
        console.log('realtime transport_event', event)
      })

      agentRef.current = agent
      sessionRef.current = session

      await session.connect({ apiKey })
      setIsRealtimeConnected(true)
      setIsMuted(Boolean((session as any).muted))
    } catch (e: any) {
      console.error('Realtime connection error:', e)
      const errorMessage = e?.message ?? 'Failed to connect to Realtime session'
      setError(`Connection failed: ${errorMessage}`)
      setIsRealtimeConnected(false)
      agentRef.current = null
      sessionRef.current = null
    } finally {
      setIsRealtimeConnecting(false)
    }
  }, [token, isRealtimeConnected, isRealtimeConnecting])

  const disconnectRealtime = useCallback(() => {
    try {
      // Prefer close() per example; fallback to connect-safe noop
      const s = sessionRef.current as any
      if (s?.close) s.close()
      else if (s?.disconnect) s.disconnect()
    } catch {
      // noop
    }
    agentRef.current = null
    sessionRef.current = null
    setIsRealtimeConnected(false)
    setIsRealtimeConnecting(false)
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    const s = sessionRef.current as any
    if (!s) return
    const newMutedState = !s.muted
    try {
      s.mute?.(newMutedState)
    } catch {
      // noop
    }
    setIsMuted(Boolean(newMutedState))
  }, [])

  return {
    token,
    setToken,
    isRealtimeConnected,
    isRealtimeConnecting,
    isMuted,
    error,
    connectRealtime,
    disconnectRealtime,
    toggleMute
  }
}


