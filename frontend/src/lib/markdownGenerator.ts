import { Workflow } from '../types/workflow'

/**
 * Generate human-readable markdown documentation from a Workflow.
 * Output is suitable for client handoff — no technical jargon.
 */
export function generateMarkdown(workflow: Workflow): string {
  const lines: string[] = []

  // Title + version header
  lines.push(`# ${workflow.name}`)
  lines.push(
    `**Version**: ${workflow.version} | **Last Updated**: ${formatDate(workflow.lastModified)}`,
  )
  lines.push('')

  // Participants table
  if (workflow.participants.length > 0) {
    lines.push('## Participants')
    lines.push('')
    lines.push('| Role | Name | Type |')
    lines.push('|------|------|------|')
    for (const p of workflow.participants) {
      const typeLabel = p.type === 'internal' ? 'Internal' : 'External'
      lines.push(`| ${p.role} | ${p.name} | ${typeLabel} |`)
    }
    lines.push('')
  }

  // Process flow
  if (workflow.steps.length > 0) {
    lines.push('## Process Flow')
    lines.push('')

    for (const step of workflow.steps) {
      const participant = workflow.participants.find((p) => p.id === step.actor)
      const actorLabel = participant
        ? `${participant.name}${participant.role ? ` (${participant.role})` : ''}`
        : step.actor

      lines.push(`### Step ${step.sequence}: ${step.action}`)
      lines.push(`**Who**: ${actorLabel}`)

      if (step.type === 'decision') {
        lines.push('**Type**: Decision Point')
      } else {
        lines.push(`**Action**: ${step.action}`)
      }

      if (step.inputs && step.inputs.length > 0) {
        lines.push(`**Input**: ${step.inputs.join(', ')}`)
      }

      if (step.outputs && step.outputs.length > 0) {
        lines.push(`**Output**: ${step.outputs.join(', ')}`)
      }

      if (step.conditions && Object.keys(step.conditions).length > 0) {
        lines.push('**Conditions**:')
        for (const [key, value] of Object.entries(step.conditions)) {
          const icon = key.toLowerCase().includes('reject') || key.toLowerCase().includes('fail')
            ? '\u2717'
            : '\u2713'
          lines.push(`- ${icon} ${capitalize(key)}: ${value}`)
        }
      }

      // Show outgoing flows
      const outFlows = workflow.flows.filter((f) => f.from === step.id)
      if (outFlows.length > 0) {
        const targets = outFlows.map((f) => {
          const targetStep = workflow.steps.find((s) => s.id === f.to)
          const label = targetStep ? targetStep.action : f.to
          return f.condition ? `${label} (${f.condition})` : label
        })
        lines.push(`**Next**: ${targets.join(' | ')}`)
      }

      lines.push('')
    }
  }

  // Session notes
  if (workflow.metadata.notes.length > 0 || workflow.metadata.sessionWith) {
    lines.push('## Session Notes')
    if (workflow.metadata.sessionWith) {
      lines.push(`**Session with**: ${workflow.metadata.sessionWith}`)
    }
    if (workflow.metadata.sessionDate) {
      lines.push(`**Date**: ${formatDate(workflow.metadata.sessionDate)}`)
    }
    lines.push('')
    for (const note of workflow.metadata.notes) {
      lines.push(`- ${note}`)
    }
    lines.push('')
  }

  // Version history
  if (workflow.versionHistory && workflow.versionHistory.length > 0) {
    lines.push('## Version History')
    lines.push('')
    for (const entry of workflow.versionHistory) {
      lines.push(`- **v${entry.version}** (${formatDate(entry.date)}): ${entry.changes}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
