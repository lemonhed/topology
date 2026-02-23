// BPMN-aligned workflow data model — single source of truth for both views

export interface Participant {
  id: string
  name: string
  type: 'internal' | 'external'
  role: string
}

export interface StepConditions {
  [key: string]: string // e.g. { approved: "Inventory available AND payment valid", rejected: "..." }
}

export interface Step {
  id: string
  sequence: number
  action: string
  actor: string // participant ID
  type: 'action' | 'decision'
  inputs?: string[]
  outputs?: string[]
  conditions?: StepConditions
}

export interface Flow {
  from: string // step ID
  to: string // step ID
  condition?: string
}

export interface WorkflowMetadata {
  sessionDate: string
  sessionWith: string
  notes: string[]
}

export interface VersionEntry {
  version: string
  date: string
  changes: string
  session: string
}

export interface Workflow {
  id: string
  name: string
  version: string
  created: string
  lastModified: string
  participants: Participant[]
  steps: Step[]
  flows: Flow[]
  metadata: WorkflowMetadata
  versionHistory?: VersionEntry[]
}

/** Creates a blank workflow with sensible defaults */
export function createEmptyWorkflow(): Workflow {
  const now = new Date().toISOString().split('T')[0]
  return {
    id: `wf_${Date.now().toString(36)}`,
    name: 'Untitled Workflow',
    version: '1.0',
    created: now,
    lastModified: now,
    participants: [],
    steps: [],
    flows: [],
    metadata: {
      sessionDate: now,
      sessionWith: '',
      notes: [],
    },
  }
}
