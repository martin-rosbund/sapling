import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import type { SaplingMailMenuAction } from '@/composables/context/useSaplingContextMenuTable'

/**
 * Returns all entity templates that are flagged as mail fields via `options.includes('isMail')`.
 */
export function getMailTemplates(templates: EntityTemplate[] | undefined): EntityTemplate[] {
  if (!templates) {
    return []
  }

  return templates.filter((template) => template.options?.includes('isMail') === true)
}

/**
 * Reads a string value from a generic record. Returns trimmed string or empty string.
 */
function readStringField(values: Record<string, unknown> | null | undefined, key: string): string {
  if (!values) {
    return ''
  }

  const raw = values[key]
  if (raw == null) {
    return ''
  }

  return String(raw).trim()
}

/**
 * Builds mail menu actions for a single item by inspecting all mail-flagged templates
 * and emitting one action per non-empty email field.
 */
export function buildMailMenuActions(
  templates: EntityTemplate[] | undefined,
  item: SaplingGenericItem | Record<string, unknown> | null | undefined,
): SaplingMailMenuAction[] {
  const mailTemplates = getMailTemplates(templates)
  if (mailTemplates.length === 0 || !item) {
    return []
  }

  const actions: SaplingMailMenuAction[] = []
  for (const template of mailTemplates) {
    const email = readStringField(item as Record<string, unknown>, template.name)
    if (!email) {
      continue
    }

    actions.push({
      templateName: template.name,
      email,
      fieldLabel: template.name,
    })
  }

  return actions
}

/**
 * Aggregates mail addresses across multiple selected items per mail-flagged template.
 * Returns one entry per template, listing all collected unique emails.
 */
export interface SaplingBulkMailAction {
  templateName: string
  fieldLabel: string
  emails: string[]
}

export function buildBulkMailActions(
  templates: EntityTemplate[] | undefined,
  items: SaplingGenericItem[] | undefined,
): SaplingBulkMailAction[] {
  const mailTemplates = getMailTemplates(templates)
  if (mailTemplates.length === 0 || !items || items.length === 0) {
    return []
  }

  const result: SaplingBulkMailAction[] = []
  for (const template of mailTemplates) {
    const collected = new Set<string>()
    for (const item of items) {
      const email = readStringField(item as Record<string, unknown>, template.name)
      if (email) {
        collected.add(email)
      }
    }

    if (collected.size === 0) {
      continue
    }

    result.push({
      templateName: template.name,
      fieldLabel: template.name,
      emails: Array.from(collected),
    })
  }

  return result
}
