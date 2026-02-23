import { useCallback, useRef, useState } from 'react'
import { z } from 'zod'
// Use the standalone browser package per the example
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents-realtime'
import type { WorkflowActions } from './useWorkflow'

/** Convert plain text to tldraw v4 richText (ProseMirror doc) */
function toRichText(text: string) {
  const lines = text.split('\n')
  return {
    type: 'doc' as const,
    content: lines.map((line) => ({
      type: 'paragraph' as const,
      ...(line ? { content: [{ type: 'text' as const, text: line }] } : {}),
    })),
  }
}

interface UseOpenAIRealtimeState {
  isRealtimeConnected: boolean
  isRealtimeConnecting: boolean
  isMuted: boolean
  error: string | null
  connectRealtime: (apiKey: string) => Promise<void>
  disconnectRealtime: () => void
  toggleMute: () => void
  setEditor: (editor: any) => void
  setWorkflowActions: (actions: WorkflowActions) => void
}

export function useOpenAIRealtime(): UseOpenAIRealtimeState {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isRealtimeConnecting, setIsRealtimeConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agentRef = useRef<RealtimeAgent | null>(null)
  const sessionRef = useRef<RealtimeSession | null>(null)
  const editorRef = useRef<any>(null)
  const workflowRef = useRef<WorkflowActions | null>(null)


  const SYSTEM_PROMPT = `You are Topo, a workflow and architecture capture assistant. You listen to the user describe business processes, workflows, or system architecture in natural conversation, then capture everything as structured data AND draw it on a whiteboard simultaneously.

You have TWO modes of tools — use both together as appropriate:

## MODE 1: WORKFLOW CAPTURE (Primary)
Use these tools when the user describes WHO does WHAT in WHAT ORDER:

### Recognizing Participants
When someone mentions a person, team, department, role, or external party, call add_participant.
Trigger words: "Sarah handles...", "the customer...", "our fulfillment team...", "the account manager..."
- Use type "external" for customers, clients, vendors, third parties
- Use type "internal" for employees, teams, departments

### Recognizing Steps
When someone describes an ACTION that happens in a process, call add_step.
Trigger words: "they submit...", "she reviews...", "the system validates...", "then we process..."
- Use type "action" for normal activities
- Use type "decision" for conditional logic ("if approved...", "depending on...", "when valid...")
- For decisions, include the conditions (e.g., approved: "Inventory available", rejected: "Payment failed")

### Recognizing Flows
When there's a sequence, call add_flow to connect steps.
Trigger words: "then...", "next...", "after that...", "once complete...", "if approved, it goes to..."
- For conditional flows, include the condition label

### Workflow Naming
When the user names or describes the overall process, call set_workflow_name.
Trigger words: "This is our order fulfillment process", "We're mapping out customer onboarding"

### Session Notes
When the user mentions something to follow up on or remember, call add_session_note.
Trigger words: "we should come back to...", "note that...", "TODO:...", "reminder:..."

## MODE 2: ARCHITECTURE DIAGRAMMING (Secondary)
Use these tools when the user describes TECHNICAL COMPONENTS and DATA FLOW:

| Shape type     | Trigger words                                                                                         |
|----------------|-------------------------------------------------------------------------------------------------------|
| database       | Postgres, MySQL, MongoDB, Redis, Supabase, Firebase, DynamoDB, database, DB, data store, cache, S3    |
| server         | Express, API, backend, Node, Django, Flask, FastAPI, microservice, Lambda, endpoint, REST, GraphQL     |
| frontend       | React, Vue, Angular, Next.js, Svelte, UI, dashboard, web app, client, browser, mobile app             |
| person         | user, customer (in tech context), actor                                                               |
| gpt_5          | AI, model, LLM, GPT, Claude, ML, machine learning, neural network, AI agent, classifier              |
| gpt_realtime   | voice AI, realtime API, speech engine, voice assistant, realtime agent, speech-to-text, TTS           |

For architecture: use draw_item + add_text (label) + connect (arrows).

## DEDUPLICATION
Track every participant and entity by name. If the user refers to someone/something already captured ("the customer", "Sarah", "the API"), reuse the existing ID. NEVER create duplicates.

## CANVAS LAYOUT
- Participants as columns across the top: x = 200, 500, 800, ... (300px apart), y = 50
- Steps flow top-to-bottom within their actor's column: y starts at 300, increments by 180px
- Architecture items: x starts at 200, spaced 250px apart
- Keep shapes well spaced — at least 200px apart in both axes

## LABELING
After EVERY draw_item call, IMMEDIATELY call add_text to label the shape below it.
- Position: (shape_x + 20, shape_y + shape_height + 10)
- Shape heights: person=140, database=200, gpt_5=160, frontend=140, gpt_realtime=120, server=160

## CONVERSATION STYLE — SILENT BY DEFAULT
- Do NOT speak or produce any audio response unless the user says "Hey Topo" (or close variations like "hey topo", "Topo").
- When you hear workflow or architecture descriptions, SILENTLY call the tools. No spoken confirmation.
- ONLY when the user says "Hey Topo" followed by a question or request, respond with a brief spoken answer.
- Act on partial information — don't wait for the full description before capturing.
- When in doubt whether something is a participant, step, or architecture component, make your best judgment and capture it.`

  const connectRealtime = useCallback(async (apiKey: string) => {
    if (!apiKey) {
      setError('An OpenAI API key is required.')
      return
    }

    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. Key should start with "sk-".')
      return
    }

    if (isRealtimeConnected || isRealtimeConnecting) return;

    setIsRealtimeConnecting(true)
    setError(null)

    try {
      // 1. Generate an ephemeral token
      const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: 'gpt-realtime',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate ephemeral token.');
      }

      const { value: ephemeralToken } = await response.json();

      // 2. Use the ephemeral token to connect
      // Geometry helpers for connections
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

        // Use shape type to determine geometry
        const shapeType = s.type
        if (shapeType === 'server' || shapeType === 'gpt_realtime') {
          // Server and GPT Realtime are rectangular
          return edgePointRect(c, hw, hh, toward)
        } else if (shapeType === 'database' || shapeType === 'user' || shapeType === 'llm') {
          // Database, user, and GPT-5 (llm shape) are more circular/elliptical
          return edgePointEllipse(c, hw, hh, toward)
        }

        // Fallback to center for unknown shapes
        return c
      }

      // Whiteboard tools
      const drawItem = tool({
        name: 'draw_item',
        description: 'Draw a component on the canvas. Use this whenever the user mentions a technology, service, or component. Coordinates are in pixels from top-left (canvas is ~1500x800). Place items with ~250px horizontal spacing. Return the UUID — save it for connections and labeling. ALWAYS call add_text immediately after to label the shape.',
        parameters: z.object({
          item_type: z.enum(['database', 'person', 'server', 'gpt_5', 'frontend', 'gpt_realtime']),
          x: z.number().describe('X coordinate in pixels'),
          y: z.number().describe('Y coordinate in pixels'),
        }),
        execute: async ({ item_type, x, y }: { item_type: 'database' | 'person' | 'server' | 'gpt_5' | 'frontend' | 'gpt_realtime', x: number, y: number }) => {
          const editor = editorRef.current
          if (!editor) throw new Error('Editor not initialised')

          const uuid = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`
          const shapeId = `shape:${uuid}`

          // Map item types to custom shape types
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
            type: shapeTypeMap[item_type],
            x,
            y,
            props: {
              w: item_type === 'person' ? 120 : item_type === 'database' ? 160 : item_type === 'gpt_5' ? 200 : item_type === 'frontend' ? 180 : item_type === 'gpt_realtime' ? 220 : 240,
              h: item_type === 'person' ? 140 : item_type === 'database' ? 200 : item_type === 'gpt_5' ? 160 : item_type === 'frontend' ? 140 : item_type === 'gpt_realtime' ? 120 : 160,
              color: item_type === 'database' ? 'green' : item_type === 'person' ? 'blue' : item_type === 'server' ? 'gray' : item_type === 'frontend' ? 'red' : item_type === 'gpt_realtime' ? 'blue' : 'purple',
            },
          }
          editor.createShapes([shape])
          console.log(`Drew ${item_type} with UUID: ${uuid}`)
          return uuid
        },
      })

      const connectItems = tool({
        name: 'connect',
        description: 'Connect two components by their UUIDs with an arrow. Use this when the user describes data flow, API calls, or any interaction between components. "one_way" (default) for directional flow (sends to, calls, queries). "two_way" for bidirectional (syncs with, communicates with). Prefer one_way for most data flow.',
        parameters: z.object({
          item1_uuid: z.string(),
          item2_uuid: z.string(),
          direction: z.enum(['one_way', 'two_way']).default('one_way').describe('Arrow direction: one_way (default) or two_way for bidirectional'),
        }),
        execute: async ({ item1_uuid, item2_uuid, direction = 'one_way' }: { item1_uuid: string; item2_uuid: string; direction?: 'one_way' | 'two_way' }) => {
          const editor = editorRef.current
          if (!editor) throw new Error('Editor not initialised')

          console.log('Connecting items:', item1_uuid, item2_uuid)

          const a = editor.getShape?.(`shape:${item1_uuid}`)
          const b = editor.getShape?.(`shape:${item2_uuid}`)
          if (!a || !b) throw new Error('One or both items not found on canvas')

          const ca = centerOf(a)
          const cb = centerOf(b)
          const start = edgePoint(a, cb)
          const end = edgePoint(b, ca)

          if (direction === 'two_way') {
            // Create a bidirectional arrow
            const arrowId = `shape:bidirectional_${item1_uuid}_${item2_uuid}`

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
                  arrowheadStart: 'arrow',
                  arrowheadEnd: 'arrow',
                },
              },
            ])

            // Create bindings for bidirectional arrow
            editor.createBindings([
              {
                id: `binding:${arrowId}_start`,
                type: 'arrow',
                fromId: arrowId,
                toId: `shape:${item1_uuid}`,
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
                toId: `shape:${item2_uuid}`,
                props: {
                  terminal: 'end',
                  isPrecise: false,
                  isExact: false,
                  normalizedAnchor: { x: 0.5, y: 0.5 }
                }
              }
            ])
          } else {
            // Create a one-way arrow (default)
            const arrowId = `shape:connection_${item1_uuid}_${item2_uuid}`

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

            // Create bindings for one-way arrow
            editor.createBindings([
              {
                id: `binding:${arrowId}_start`,
                type: 'arrow',
                fromId: arrowId,
                toId: `shape:${item1_uuid}`,
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
                toId: `shape:${item2_uuid}`,
                props: {
                  terminal: 'end',
                  isPrecise: false,
                  isExact: false,
                  normalizedAnchor: { x: 0.5, y: 0.5 }
                }
              }
            ])
          }
          return 'ok'
        },
      })

      const deleteItem = tool({
        name: 'delete_item',
        description: 'Delete an item by its UUID',
        parameters: z.object({
          item_uuid: z.string(),
        }),
        execute: async ({ item_uuid }: { item_uuid: string }) => {
          const editor = editorRef.current
          if (!editor) throw new Error('Editor not initialised')

          const shape = editor.getShape?.(`shape:${item_uuid}`)
          if (shape) editor.deleteShapes([shape.id])
          return 'ok'
        },
      })

      const addText = tool({
        name: 'add_text',
        description: 'Add a text label to the whiteboard. Use this IMMEDIATELY after every draw_item call to label the shape with its specific technology name (e.g., "Postgres", "Express API"). Place the label at (shape_x + 20, shape_y + shape_height + 10) so it appears just below the shape. Also use for bulleted summaries of high-level descriptions.',
        parameters: z.object({
          text: z.string(),
          x: z.number().describe('X coordinate in pixels'),
          y: z.number().describe('Y coordinate in pixels'),
        }),
        execute: async ({ text, x, y }: { text: string, x: number, y: number }) => {
          const editor = editorRef.current
          if (!editor) throw new Error('Editor not initialised')

          const uuid = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`
          const shape = {
            id: `shape:${uuid}`,
            type: 'text',
            x,
            y,
            props: {
              richText: toRichText(text),
              size: 's',
              color: 'black',
            },
          }
          editor.createShapes([shape])
          return uuid
        },
      })

      // ── Workflow capture tools ──────────────────────────────────────

      const addParticipantTool = tool({
        name: 'add_participant',
        description: 'Add a person, team, or role to the workflow. Use when someone mentions a participant in a business process. Returns the participant ID for use in add_step.',
        parameters: z.object({
          name: z.string().describe('Name of the person or team (e.g., "Sarah", "Fulfillment Team", "Customer")'),
          type: z.enum(['internal', 'external']).describe('"internal" for employees/teams, "external" for customers/vendors/third parties'),
          role: z.string().describe('Their role (e.g., "Account Manager", "Initiator", "Operations")'),
        }),
        execute: async ({ name, type, role }: { name: string; type: 'internal' | 'external'; role: string }) => {
          const wf = workflowRef.current
          const editor = editorRef.current

          let participantId = name.toLowerCase().replace(/\s+/g, '_')

          // Write to workflow state if available
          if (wf) {
            // Check for duplicate
            const existing = wf.workflow.participants.find(
              (p) => p.id === participantId || p.name.toLowerCase() === name.toLowerCase()
            )
            if (existing) return existing.id
            participantId = wf.addParticipant(name, type, role)
          }

          // Draw person shape on canvas
          if (editor) {
            const participantCount = wf ? wf.workflow.participants.length : 1
            const x = 200 + (participantCount - 1) * 300
            const y = 50
            const shapeId = `shape:participant_${participantId}`

            editor.createShapes([{
              id: shapeId,
              type: 'user',
              x,
              y,
              props: { w: 120, h: 140, color: type === 'external' ? 'orange' : 'blue' },
            }])

            // Label below
            editor.createShapes([{
              id: `shape:label_participant_${participantId}`,
              type: 'text',
              x: x + 10,
              y: y + 150,
              props: { richText: toRichText(`${name}\n(${role})`), size: 's', color: 'black' },
            }])
          }

          console.log(`Added participant: ${name} (${role})`)
          return participantId
        },
      })

      const addStepTool = tool({
        name: 'add_step',
        description: 'Add a process step to the workflow. Use when someone describes an action or decision in a business process. Steps are auto-numbered. Returns the step ID for use in add_flow.',
        parameters: z.object({
          action: z.string().describe('What happens in this step (e.g., "Submit order request", "Validate inventory and payment")'),
          actor_name: z.string().describe('Name of the participant who performs this step (must match a previously added participant name)'),
          step_type: z.enum(['action', 'decision']).describe('"action" for normal steps, "decision" for conditional branch points'),
          conditions: z.record(z.string(), z.string()).optional().describe('For decisions only — conditions as key-value pairs (e.g., {"approved": "Inventory available", "rejected": "Payment failed"})'),
        }),
        execute: async ({ action, actor_name, step_type, conditions }) => {
          const wf = workflowRef.current
          const editor = editorRef.current

          // Find the actor's participant ID
          let actorId = actor_name.toLowerCase().replace(/\s+/g, '_')
          let actorIndex = 0
          if (wf) {
            const participant = wf.workflow.participants.find(
              (p) => p.name.toLowerCase() === actor_name.toLowerCase() || p.id === actorId
            )
            if (participant) {
              actorId = participant.id
              actorIndex = wf.workflow.participants.indexOf(participant)
            }
          }

          // Write to workflow state
          let stepId = `step_${Date.now().toString(36)}`
          if (wf) {
            stepId = wf.addStep(action, actorId, step_type, conditions)
          }

          // Draw on canvas — steps flow top-to-bottom in their actor's column
          if (editor) {
            const stepCount = wf ? wf.workflow.steps.length : 1
            const x = 200 + actorIndex * 300
            const y = 300 + (stepCount - 1) * 180
            const w = 200
            const h = step_type === 'decision' ? 100 : 80

            const uuid = stepId.replace('step_', '')
            const shapeId = `shape:step_${uuid}`

            // Use tldraw geo shape for steps
            editor.createShapes([{
              id: shapeId,
              type: 'geo',
              x,
              y,
              props: {
                w,
                h,
                geo: step_type === 'decision' ? 'diamond' : 'rectangle',
                richText: toRichText(action),
                size: 's',
                color: step_type === 'decision' ? 'orange' : 'blue',
                fill: 'semi',
              },
            }])
          }

          console.log(`Added step: ${action} (${step_type}) by ${actor_name}`)
          return stepId
        },
      })

      const addFlowTool = tool({
        name: 'add_flow',
        description: 'Connect two workflow steps with a flow. Use when someone describes sequence ("then...", "next...", "after that...") or conditional branching ("if approved, goes to...").',
        parameters: z.object({
          from_step: z.string().describe('Step ID of the source step'),
          to_step: z.string().describe('Step ID of the destination step'),
          condition: z.string().optional().describe('Condition label for the flow (e.g., "approved", "rejected"). Omit for default sequential flow.'),
        }),
        execute: async ({ from_step, to_step, condition }: { from_step: string; to_step: string; condition?: string }) => {
          const wf = workflowRef.current
          const editor = editorRef.current

          // Write to workflow state
          if (wf) {
            wf.addFlow(from_step, to_step, condition)
          }

          // Draw arrow on canvas
          if (editor) {
            const fromUuid = from_step.replace('step_', '')
            const toUuid = to_step.replace('step_', '')
            const fromShape = editor.getShape?.(`shape:step_${fromUuid}`)
            const toShape = editor.getShape?.(`shape:step_${toUuid}`)

            if (fromShape && toShape) {
              const arrowId = `shape:flow_${fromUuid}_${toUuid}`
              const ca = centerOf(fromShape)
              const cb = centerOf(toShape)
              const start = { x: ca.x, y: (fromShape.y ?? 0) + (fromShape.props?.h ?? 80) }
              const end = { x: cb.x, y: toShape.y ?? 0 }

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

              // Add condition label if present
              if (condition) {
                editor.createShapes([{
                  id: `shape:flowlabel_${fromUuid}_${toUuid}`,
                  type: 'text',
                  x: (start.x + end.x) / 2 + 10,
                  y: (start.y + end.y) / 2 - 10,
                  props: { richText: toRichText(condition), size: 's', color: 'grey' },
                }])
              }
            }
          }

          console.log(`Added flow: ${from_step} → ${to_step}${condition ? ` (${condition})` : ''}`)
          return 'ok'
        },
      })

      const setWorkflowNameTool = tool({
        name: 'set_workflow_name',
        description: 'Set or update the workflow name/title. Use when the user names the process (e.g., "This is our order fulfillment process").',
        parameters: z.object({
          name: z.string().describe('Name of the workflow (e.g., "Customer Order Fulfillment")'),
        }),
        execute: async ({ name }: { name: string }) => {
          const wf = workflowRef.current
          if (wf) {
            wf.setWorkflowName(name)
          }
          console.log(`Set workflow name: ${name}`)
          return 'ok'
        },
      })

      const addSessionNoteTool = tool({
        name: 'add_session_note',
        description: 'Add a follow-up note or reminder to the session. Use when the user says "we should come back to...", "note that...", "TODO:", etc.',
        parameters: z.object({
          note: z.string().describe('The note text'),
        }),
        execute: async ({ note }: { note: string }) => {
          const wf = workflowRef.current
          if (wf) {
            const currentNotes = wf.workflow.metadata.notes
            wf.updateMetadata({ notes: [...currentNotes, note] })
          }
          console.log(`Added session note: ${note}`)
          return 'ok'
        },
      })

      const agent = new RealtimeAgent({
        name: 'Assistant',
        instructions: SYSTEM_PROMPT,
        tools: [
          drawItem, connectItems, deleteItem, addText,
          addParticipantTool, addStepTool, addFlowTool, setWorkflowNameTool, addSessionNoteTool,
        ]
      });

      const REALTIME_MODEL = 'gpt-realtime'

      const session = new RealtimeSession(agent, {
        model: REALTIME_MODEL,
        config: {
          audio: {
            input: {
              turnDetection: {
                type: 'server_vad',
                silenceDurationMs: 800,
                threshold: 0.5,
              },
            },
          },
        },
      })

      // Log all session events for debugging
      session.on('transport_event', (event: unknown) => {
        const evt = event as any
        const type = evt?.type ?? ''
        // Highlight response/session events prominently
        if (type === 'error') {
          console.error('❌ SERVER ERROR', JSON.stringify(evt, null, 2))
        } else if (type.startsWith('response.')) {
          if (type === 'response.done') {
            const resp = evt?.response
            console.log('🔵 RESPONSE DONE', 'status:', resp?.status, 'output:', JSON.stringify(resp?.output), 'status_details:', JSON.stringify(resp?.status_details))
          } else {
            console.log('🔵 RESPONSE EVENT', type, evt)
          }
        } else if (type === 'session.updated') {
          console.log('✅ SESSION UPDATED', JSON.stringify(evt?.session, null, 2))
        } else if (type.startsWith('input_audio_buffer.')) {
          console.log('🎤', type)
        } else {
          console.log('realtime transport_event', type, evt)
        }
      })
      session.on('error', (error: unknown) => {
        console.error('🔴 realtime session error', JSON.stringify(error, null, 2))
      })
      session.on('agent_start', (...args: unknown[]) => {
        console.log('🟢 agent_start', args)
      })
      session.on('agent_end', (...args: unknown[]) => {
        console.log('🟢 agent_end', args)
      })
      session.on('tool_start', (...args: unknown[]) => {
        console.log('🔧 tool_start', args)
      })
      session.on('tool_end', (...args: unknown[]) => {
        console.log('🔧 tool_end', args)
      })
      session.on('guardrail_tripped', (...args: unknown[]) => {
        console.log('⚠️ guardrail_tripped', args)
      })
      session.on('history_updated', (...args: unknown[]) => {
        console.log('📜 history_updated', args)
      })

      agentRef.current = agent
      sessionRef.current = session

      await session.connect({ apiKey: ephemeralToken, model: REALTIME_MODEL })

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
  }, [isRealtimeConnected, isRealtimeConnecting])

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

  const setEditor = useCallback((editor: any) => {
    editorRef.current = editor
  }, [])

  const setWorkflowActions = useCallback((actions: WorkflowActions) => {
    workflowRef.current = actions
  }, [])

  return {
    isRealtimeConnected,
    isRealtimeConnecting,
    isMuted,
    error,
    connectRealtime,
    disconnectRealtime,
    toggleMute,
    setEditor,
    setWorkflowActions,
  }
}
