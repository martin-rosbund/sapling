import type { ImportBatchRowSummary } from '@/services/api.import.service'

const IMPORT_ERROR_REPORT_DELIMITER = ';'
const IMPORT_ERROR_REPORT_BOM = '\uFEFF'

interface ImportErrorReportLabels {
  importStatusLabel: (status: string) => string
  importActionLabel: (action: string) => string
  importMessageLabel: (message: string | null | undefined) => string
}

export function buildImportErrorReportCsv(
  rows: ImportBatchRowSummary[],
  labels: ImportErrorReportLabels,
): string {
  const rawHeaders = collectErrorReportRawHeaders(rows)
  const headers = [
    'rowNumber',
    'status',
    'action',
    'targetReference',
    'message',
    'messageKey',
    'externalKeyHash',
    ...rawHeaders.map((header) => `raw.${header}`),
  ]
  const lines = [
    headers.map(escapeImportCsvCell).join(IMPORT_ERROR_REPORT_DELIMITER),
    ...rows.map((row) =>
      [
        row.rowNumber,
        labels.importStatusLabel(row.status),
        row.action ? labels.importActionLabel(row.action) : '',
        row.targetReference ?? '',
        labels.importMessageLabel(row.message),
        row.message ?? '',
        row.externalKeyHash ?? '',
        ...rawHeaders.map((header) => row.rawData[header] ?? ''),
      ]
        .map(escapeImportCsvCell)
        .join(IMPORT_ERROR_REPORT_DELIMITER),
    ),
  ]

  return `${IMPORT_ERROR_REPORT_BOM}${lines.join('\r\n')}\r\n`
}

export function createImportErrorReportFilename(filename: string): string {
  const baseName = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${baseName || 'import'}-fehlerprotokoll.csv`
}

function collectErrorReportRawHeaders(rows: ImportBatchRowSummary[]): string[] {
  return Array.from(
    rows.reduce<Set<string>>((headers, row) => {
      Object.keys(row.rawData).forEach((header) => headers.add(header))
      return headers
    }, new Set<string>()),
  )
}

function escapeImportCsvCell(value: unknown): string {
  const text = String(value ?? '')

  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}
