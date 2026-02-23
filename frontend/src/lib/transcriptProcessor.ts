// Transcript-to-workflow processing engine
// Pure async function — NOT a React hook. Builds a Workflow object via OpenAI
// Chat Completions tool-calling loop, then returns the finished result.

import type { Workflow, Participant, Step, Flow } from '../types/workflow'
import { createEmptyWorkflow } from '../types/workflow'

// ── Types ──────────────────────────────────────────────────────────────

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export type ProgressCallback = (status: string, detail?: string) => void

// ── System prompt for batch extraction ─────────────────────────────────

const TRANSCRIPT_SYSTEM_PROMPT = `You are a workflow extraction assistant. You are given a transcript of a meeting, call, or interview. Your job is to analyze it and extract a structured workflow by calling the provided tools.

## EXTRACTION RULES

### Participants
When the transcript mentions a person, team, department, role, or external party, call add_participant.
- Use type "external" for customers, clients, vendors, third parties
- Use type "internal" for employees, teams, departments
- Extract the most specific role mentioned

### Steps
When the transcript describes an ACTION in a process, call add_step.
- Use type "action" for normal activities
- Use type "decision" for conditional logic ("if approved...", "depending on...", "when valid...")
- For decisions, include the conditions (e.g., approved: "Inventory available", rejected: "Payment failed")
- Identify the actor by matching to a previously added participant name

### Flows
After extracting steps, connect them in sequence using add_flow.
- Use condition labels for conditional branching
- Connect ALL steps — every step should have at least one incoming or outgoing flow (except the first and last)

### Workflow Name
Infer a descriptive name for the overall process and call set_workflow_name.

### Session Notes
For any follow-up items, TODOs, open questions, or important context mentioned in the transcript, call add_session_note.

## DEDUPLICATION
Track every participant by name. If the transcript refers to someone already captured, reuse the existing name. NEVER create duplicates.

## ORDERING
1. First, call set_workflow_name
2. Then, add ALL participants
3. Then, add ALL steps in chronological order
4. Then, add ALL flows connecting the steps
5. Finally, add any session notes

## COMPLETENESS
Process the ENTIRE transcript. Do not stop early. Extract every meaningful process step, participant, and connection.

## TRANSCRIPT FORMATS
The transcript may be in various formats:
- Timestamped (e.g., "[00:05:23] Speaker: ...")
- Speaker-labeled (e.g., "John: ...")
- Bullet notes (e.g., "- Customer submits order")
- Narrative prose
Handle all formats gracefully.`

// ── OpenAI tool definitions (JSON Schema format) ──────────────────────

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'add_participant',
      description: 'Add a person, team, or role to the workflow. Returns the participant ID.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the person or team (e.g., "Sarah", "Fulfillment Team", "Customer")' },
          type: { type: 'string', enum: ['internal', 'external'], description: '"internal" for employees/teams, "external" for customers/vendors/third parties' },
          role: { type: 'string', description: 'Their role (e.g., "Account Manager", "Initiator", "Operations")' },
        },
        required: ['name', 'type', 'role'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_step',
      description: 'Add a process step to the workflow. Steps are auto-numbered. Returns the step ID for use in add_flow.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'What happens in this step (e.g., "Submit order request", "Validate inventory")' },
          actor_name: { type: 'string', description: 'Name of the participant who performs this step (must match a previously added participant)' },
          step_type: { type: 'string', enum: ['action', 'decision'], description: '"action" for normal steps, "decision" for conditional branch points' },
          conditions: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'For decisions only — conditions as key-value pairs (e.g., {"approved": "Inventory available", "rejected": "Payment failed"})',
          },
        },
        required: ['action', 'actor_name', 'step_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_flow',
      description: 'Connect two workflow steps with a flow. Use when describing sequence ("then...", "next...") or conditional branching.',
      parameters: {
        type: 'object',
        properties: {
          from_step: { type: 'string', description: 'Step ID of the source step' },
          to_step: { type: 'string', description: 'Step ID of the destination step' },
          condition: { type: 'string', description: 'Condition label for conditional flows (e.g., "approved", "rejected"). Omit for sequential flow.' },
        },
        required: ['from_step', 'to_step'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_workflow_name',
      description: 'Set or update the workflow name/title.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the workflow (e.g., "Customer Order Fulfillment")' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_session_note',
      description: 'Add a follow-up note, TODO, or open question from the transcript.',
      parameters: {
        type: 'object',
        properties: {
          note: { type: 'string', description: 'The note text' },
        },
        required: ['note'],
      },
    },
  },
]

// ── Pure tool execution (operates on plain Workflow object, no React) ──

function executeToolCall(
  workflow: Workflow,
  toolName: string,
  args: Record<string, unknown>,
): string {
  switch (toolName) {
    case 'add_participant': {
      const name = args.name as string
      const type = args.type as 'internal' | 'external'
      const role = args.role as string
      const id = name.toLowerCase().replace(/\s+/g, '_')

      // Deduplicate
      const existing = workflow.participants.find(
        (p) => p.id === id || p.name.toLowerCase() === name.toLowerCase(),
      )
      if (existing) return existing.id

      const participant: Participant = { id, name, type, role }
      workflow.participants.push(participant)
      return id
    }

    case 'add_step': {
      const action = args.action as string
      const actorName = args.actor_name as string
      const stepType = args.step_type as 'action' | 'decision'
      const conditions = args.conditions as Record<string, string> | undefined

      const actorId = actorName.toLowerCase().replace(/\s+/g, '_')
      const participant = workflow.participants.find(
        (p) => p.name.toLowerCase() === actorName.toLowerCase() || p.id === actorId,
      )
      const resolvedActorId = participant ? participant.id : actorId

      const sequence = workflow.steps.length + 1
      const id = `step_${sequence}`
      const step: Step = {
        id,
        sequence,
        action,
        actor: resolvedActorId,
        type: stepType,
        ...(conditions && { conditions }),
      }
      workflow.steps.push(step)
      return id
    }

    case 'add_flow': {
      const fromStep = args.from_step as string
      const toStep = args.to_step as string
      const condition = args.condition as string | undefined

      const flow: Flow = {
        from: fromStep,
        to: toStep,
        ...(condition && { condition }),
      }
      workflow.flows.push(flow)
      return 'ok'
    }

    case 'set_workflow_name': {
      workflow.name = args.name as string
      return 'ok'
    }

    case 'add_session_note': {
      workflow.metadata.notes.push(args.note as string)
      return 'ok'
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}

// ── Main processing function ──────────────────────────────────────────

export async function processTranscript(
  transcript: string,
  apiKey: string,
  onProgress?: ProgressCallback,
): Promise<Workflow> {
  const workflow = createEmptyWorkflow()

  const messages: ChatMessage[] = [
    { role: 'system', content: TRANSCRIPT_SYSTEM_PROMPT },
    { role: 'user', content: `Here is the transcript to analyze:\n\n${transcript}` },
  ]

  onProgress?.('Analyzing transcript...')

  let iterations = 0
  const MAX_ITERATIONS = 20

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages,
        tools: TOOLS,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} — ${errorText}`)
    }

    const result = await response.json()
    const choice = result.choices?.[0]

    if (!choice) {
      throw new Error('No response from OpenAI')
    }

    const assistantMessage = choice.message

    // Add assistant response to message history
    messages.push({
      role: 'assistant',
      content: assistantMessage.content,
      ...(assistantMessage.tool_calls && { tool_calls: assistantMessage.tool_calls }),
    })

    // If model is done (no more tool calls), break
    if (choice.finish_reason === 'stop' || !assistantMessage.tool_calls) {
      onProgress?.(
        'Complete',
        `Extracted ${workflow.participants.length} participants, ${workflow.steps.length} steps, ${workflow.flows.length} flows`,
      )
      break
    }

    // Process tool calls
    if (assistantMessage.tool_calls) {
      onProgress?.('Building workflow...', `Processing ${assistantMessage.tool_calls.length} operations...`)

      for (const toolCall of assistantMessage.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          const toolResult = executeToolCall(workflow, toolCall.function.name, args)

          // Report per-tool progress
          const detail = args.name || args.action || args.note || ''
          onProgress?.('Building workflow...', `${toolCall.function.name}: ${detail}`)

          // Add tool result to message history
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult,
          })
        } catch (parseErr) {
          // If we can't parse arguments, send error back to model
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: Failed to parse arguments — ${parseErr}`,
          })
        }
      }
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn('Transcript processing hit iteration limit')
  }

  return workflow
}
