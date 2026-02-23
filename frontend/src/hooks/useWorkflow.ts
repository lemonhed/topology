import { useCallback, useRef, useState } from 'react'
import {
  Workflow,
  Participant,
  Step,
  Flow,
  StepConditions,
  createEmptyWorkflow,
} from '../types/workflow'

export interface WorkflowActions {
  workflow: Workflow
  addParticipant: (name: string, type: 'internal' | 'external', role: string) => string
  addStep: (
    action: string,
    actorId: string,
    stepType: 'action' | 'decision',
    conditions?: StepConditions,
    inputs?: string[],
    outputs?: string[],
  ) => string
  addFlow: (fromStepId: string, toStepId: string, condition?: string) => void
  updateMetadata: (updates: Partial<Workflow['metadata']>) => void
  setWorkflowName: (name: string) => void
  resetWorkflow: () => void
  loadWorkflow: (data: Workflow) => void
  getWorkflow: () => Workflow
}

export function useWorkflow() {
  const [workflow, setWorkflow] = useState<Workflow>(createEmptyWorkflow)

  // Ref so tool callbacks can read latest state synchronously
  const workflowRef = useRef<Workflow>(workflow)

  // Keep ref in sync
  const updateWorkflow = useCallback((updater: (prev: Workflow) => Workflow) => {
    setWorkflow((prev) => {
      const next = updater(prev)
      next.lastModified = new Date().toISOString().split('T')[0]
      workflowRef.current = next
      return next
    })
  }, [])

  const addParticipant = useCallback(
    (name: string, type: 'internal' | 'external', role: string): string => {
      const id = name.toLowerCase().replace(/\s+/g, '_')
      const participant: Participant = { id, name, type, role }
      updateWorkflow((prev) => ({
        ...prev,
        participants: [...prev.participants, participant],
      }))
      return id
    },
    [updateWorkflow],
  )

  const addStep = useCallback(
    (
      action: string,
      actorId: string,
      stepType: 'action' | 'decision',
      conditions?: StepConditions,
      inputs?: string[],
      outputs?: string[],
    ): string => {
      const current = workflowRef.current
      const sequence = current.steps.length + 1
      const id = `step_${sequence}`
      const step: Step = {
        id,
        sequence,
        action,
        actor: actorId,
        type: stepType,
        ...(inputs && { inputs }),
        ...(outputs && { outputs }),
        ...(conditions && { conditions }),
      }
      updateWorkflow((prev) => ({
        ...prev,
        steps: [...prev.steps, step],
      }))
      return id
    },
    [updateWorkflow],
  )

  const addFlow = useCallback(
    (fromStepId: string, toStepId: string, condition?: string): void => {
      const flow: Flow = {
        from: fromStepId,
        to: toStepId,
        ...(condition && { condition }),
      }
      updateWorkflow((prev) => ({
        ...prev,
        flows: [...prev.flows, flow],
      }))
    },
    [updateWorkflow],
  )

  const updateMetadata = useCallback(
    (updates: Partial<Workflow['metadata']>): void => {
      updateWorkflow((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, ...updates },
      }))
    },
    [updateWorkflow],
  )

  const setWorkflowName = useCallback(
    (name: string): void => {
      updateWorkflow((prev) => ({ ...prev, name }))
    },
    [updateWorkflow],
  )

  const resetWorkflow = useCallback((): void => {
    const fresh = createEmptyWorkflow()
    workflowRef.current = fresh
    setWorkflow(fresh)
  }, [])

  const loadWorkflow = useCallback((data: Workflow): void => {
    workflowRef.current = data
    setWorkflow(data)
  }, [])

  const getWorkflow = useCallback((): Workflow => {
    return workflowRef.current
  }, [])

  const actions: WorkflowActions = {
    workflow,
    addParticipant,
    addStep,
    addFlow,
    updateMetadata,
    setWorkflowName,
    resetWorkflow,
    loadWorkflow,
    getWorkflow,
  }

  return { ...actions, workflowRef }
}
