import { Workflow } from '../types/workflow'

const KEY_PREFIX = 'topology_workflow_'
const INDEX_KEY = 'topology_workflow_index'

/** Save a workflow to localStorage */
export function saveWorkflow(workflow: Workflow): void {
  const key = `${KEY_PREFIX}${workflow.id}`
  localStorage.setItem(key, JSON.stringify(workflow))

  // Update index
  const index = getWorkflowIndex()
  const existing = index.findIndex((e) => e.id === workflow.id)
  const entry = { id: workflow.id, name: workflow.name, lastModified: workflow.lastModified }
  if (existing >= 0) {
    index[existing] = entry
  } else {
    index.push(entry)
  }
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

/** Load a workflow from localStorage by ID */
export function loadWorkflow(id: string): Workflow | null {
  const key = `${KEY_PREFIX}${id}`
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Workflow
  } catch {
    return null
  }
}

/** List all saved workflows (summary only) */
export function listWorkflows(): Array<{ id: string; name: string; lastModified: string }> {
  return getWorkflowIndex()
}

/** Delete a workflow from localStorage */
export function deleteWorkflow(id: string): void {
  const key = `${KEY_PREFIX}${id}`
  localStorage.removeItem(key)

  const index = getWorkflowIndex().filter((e) => e.id !== id)
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

function getWorkflowIndex(): Array<{ id: string; name: string; lastModified: string }> {
  const raw = localStorage.getItem(INDEX_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}
