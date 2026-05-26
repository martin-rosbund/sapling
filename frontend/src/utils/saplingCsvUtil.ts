import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'

const CSV_DELIMITER = ';'
const CSV_BOM = '\uFEFF'

export function getImportableCsvTemplates(entityTemplates: EntityTemplate[]): EntityTemplate[] {
  return entityTemplates.filter((template) => {
    if (!template.name) {
      return false
    }

    if (template.name === 'handle') {
      return true
    }

    if (template.isPersistent === false) {
      return false
    }

    if (template.options?.includes('isReadOnly')) {
      return false
    }

    if (template.kind && ['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind)) {
      return false
    }

    return true
  })
}

export function buildCsvTemplate(entityTemplates: EntityTemplate[]): string {
  return buildCsv([], entityTemplates)
}

export function buildCsv(items: SaplingGenericItem[], entityTemplates: EntityTemplate[]): string {
  const headers = getCsvHeaders(entityTemplates)
  const lines = [
    headers.map(escapeCsvCell).join(CSV_DELIMITER),
    ...items.map((item) =>
      headers
        .map((header) => escapeCsvCell(normalizeExportValue(item[header])))
        .join(CSV_DELIMITER),
    ),
  ]

  return `${CSV_BOM}${lines.join('\r\n')}\r\n`
}

function getCsvHeaders(entityTemplates: EntityTemplate[]): string[] {
  const fieldNames = getImportableCsvTemplates(entityTemplates).map((template) => template.name)
  return ['handle', ...fieldNames.filter((fieldName) => fieldName !== 'handle')]
}

export function parseCsv(text: string): Record<string, unknown>[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  const [headerRow, ...dataRows] = rows

  if (!headerRow) {
    return []
  }

  const headers = headerRow.map((header) => header.trim()).filter(Boolean)

  return dataRows
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index] == null ? '' : row[index]]),
      ),
    )
    .filter((row) => Object.values(row).some((value) => String(value ?? '').trim().length > 0))
}

function parseCsvRows(text: string): string[][] {
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let isQuoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        cell += '"'
        index += 1
      } else {
        isQuoted = !isQuoted
      }
      continue
    }

    if (!isQuoted && char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!isQuoted && (char === '\n' || char === '\r')) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''

      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      continue
    }

    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const semicolonCount = countDelimiter(firstLine, ';')
  const commaCount = countDelimiter(firstLine, ',')
  const tabCount = countDelimiter(firstLine, '\t')

  if (tabCount > semicolonCount && tabCount > commaCount) {
    return '\t'
  }

  return semicolonCount >= commaCount ? ';' : ','
}

function countDelimiter(value: string, delimiter: string): number {
  let count = 0
  let isQuoted = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '"') {
      isQuoted = !isQuoted
    } else if (!isQuoted && char === delimiter) {
      count += 1
    }
  }

  return count
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '')

  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function normalizeExportValue(value: unknown): unknown {
  if (value == null) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(normalizeExportValue).join(', ')
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return record.handle ?? ''
  }

  return value
}
