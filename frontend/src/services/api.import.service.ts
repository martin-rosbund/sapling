import axios from 'axios'
import { pushApiErrorMessage } from '@/services/api.error.service'
import { buildApiUrl } from '@/services/api.client'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'

export interface ImportFieldMapping {
  sourceColumn: string
  targetField: string
}

export interface ImportFieldDefault {
  targetField: string
  value: unknown
}

export type ImportRelationMappingMode = 'handle' | 'value' | 'externalKey'

export interface ImportRelationMapping {
  targetField: string
  mode: ImportRelationMappingMode
  sourceColumn?: string
  sourceColumns?: string[]
  sourceHandle?: string | null
}

export interface ImportGenericReferenceMapping {
  entityHandle: string
  sourceHandle?: string | null
  keyColumns: string[]
}

export type ImportValueMappingFallback = 'keep' | 'empty' | 'error'

export interface ImportValueMapping {
  targetField: string
  values: Record<string, unknown>
  fallback?: ImportValueMappingFallback
}

export interface ImportAiSuggestionFieldMapping extends ImportFieldMapping {
  confidence: number
  reason?: string | null
}

export interface ImportAiSuggestionExternalKey {
  columns: string[]
  confidence: number
  reason?: string | null
}

export interface ImportAiSuggestionReferenceField {
  targetField: string
  referenceName: string
  sourceColumn?: string | null
  confidence: number
  reason?: string | null
}

export interface ImportAiSuggestionValueMapping extends ImportValueMapping {
  confidence: number
  reason?: string | null
}

export interface ImportAiSuggestion {
  mappings: ImportAiSuggestionFieldMapping[]
  externalKey: ImportAiSuggestionExternalKey | null
  referenceFields: ImportAiSuggestionReferenceField[]
  valueMappings: ImportAiSuggestionValueMapping[]
  warnings: string[]
  providerHandle?: string | null
  modelHandle?: string | null
}

export interface ConfigureImportBatchPayload {
  entityHandle: string
  sourceHandle?: string | null
  templateHandle?: number | null
  keyColumns?: string[]
  mappings: ImportFieldMapping[]
  fieldDefaults?: ImportFieldDefault[]
  relationMappings?: ImportRelationMapping[]
  valueMappings?: ImportValueMapping[]
  genericReferenceMapping?: ImportGenericReferenceMapping | null
}

export interface ImportTemplateSummary {
  handle: number | null
  title: string
  description: string | null
  sourceHandle: string
  entityHandle: string
  isActive: boolean
  mapping: {
    mappings?: ImportFieldMapping[]
    fieldDefaults?: ImportFieldDefault[]
    relationMappings?: ImportRelationMapping[]
    valueMappings?: ImportValueMapping[]
  } | null
  externalKeyColumns: string[] | null
  genericReferenceMapping: ImportGenericReferenceMapping | null
}

interface ImportTemplateRecord {
  handle?: number | null
  title?: string | null
  description?: string | null
  source?: string | { handle?: string | null } | null
  targetEntity?: string | { handle?: string | null } | null
  isActive?: boolean
  mapping?: ImportTemplateSummary['mapping']
  externalKeyColumns?: string[] | null
  genericReferenceMapping?: ImportGenericReferenceMapping | null
  valueMappings?: ImportTemplateValueMappingRecord[]
}

interface ImportTemplateValueMappingRecord {
  targetField?: string | null
  sourceValue?: string | null
  targetValue?: string | null
  fallback?: ImportValueMappingFallback | string | null
}

export interface SaveImportTemplatePayload extends ConfigureImportBatchPayload {
  handle?: number | null
  title: string
  description?: string | null
  isActive?: boolean
}

export interface ImportBatchRowSummary {
  handle: number | null
  rowNumber: number
  status: string
  action: string | null
  targetReference: string | null
  externalKeyHash: string | null
  externalKeyParts: Record<string, unknown> | null
  rawData: Record<string, unknown>
  payload: Record<string, unknown> | null
  message: string | null
}

export interface ImportBatchSummary {
  handle: number | null
  status: string
  currentOperation?: string | null
  filename: string
  mimetype?: string | null
  fileSize?: number | null
  sourceHandle?: string | null
  entityHandle?: string | null
  templateHandle?: number | null
  rowCount: number
  processedCount: number
  readyCount: number
  errorCount: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  delimiter?: string | null
  headers: string[]
  sampleRows: Record<string, unknown>[]
  mapping?: {
    mappings?: ImportFieldMapping[]
    fieldDefaults?: ImportFieldDefault[]
    relationMappings?: ImportRelationMapping[]
    valueMappings?: ImportValueMapping[]
  } | null
  externalKeyColumns?: string[] | null
  genericReferenceMapping?: object | null
  jobId?: string | null
  startedAt?: string | Date | null
  executedAt?: string | Date | null
  completedAt?: string | Date | null
  failedAt?: string | Date | null
  lastError?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  resultSummary: {
    totalRows: number
    processedRows: number
    readyRows: number
    errorRows: number
    createdRows: number
    updatedRows: number
    skippedRows: number
    failedRows: number
  }
  rows: ImportBatchRowSummary[]
}

export type ImportMatchRecommendedAction = 'create' | 'update' | 'ambiguous' | 'error'

export interface ImportMatchCandidate {
  reference: string
  displayValue: string
  confidence: number
  reason: string
}

export interface ImportMatchRow {
  rowNumber: number
  recommendedAction: ImportMatchRecommendedAction
  confidence: number
  matchedReference: string | null
  candidates: ImportMatchCandidate[]
  reason: string
  blockingIssues: string[]
}

export interface ImportMatchResponse {
  batchHandle: number
  entityHandle: string
  sampledRows: number
  rows: ImportMatchRow[]
}

export interface ImportBatchSourceValues {
  values: string[]
  isTruncated: boolean
}

class ApiImportService {
  static async listOpenBatches(): Promise<ImportBatchSummary[]> {
    try {
      const response = await axios.get<ImportBatchSummary[]>(buildApiUrl('import/batches/open'))
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async getBatch(handle: number): Promise<ImportBatchSummary> {
    try {
      const response = await axios.get<ImportBatchSummary>(buildApiUrl(`import/batches/${handle}`))
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async getBatchErrorRows(handle: number): Promise<ImportBatchRowSummary[]> {
    try {
      const response = await axios.get<{ rows: ImportBatchRowSummary[] }>(
        buildApiUrl(`import/batches/${handle}/error-rows`),
      )
      return response.data.rows
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async getBatchSourceValues(
    handle: number,
    params: {
      column: string
      limit?: number | null
    },
  ): Promise<ImportBatchSourceValues> {
    try {
      const response = await axios.get<ImportBatchSourceValues>(
        buildApiUrl(`import/batches/${handle}/source-values`),
        { params },
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async listTemplates(params: {
    entityHandle?: string | null
    sourceHandle?: string | null
  }): Promise<ImportTemplateSummary[]> {
    try {
      const filter: FilterQuery = { isActive: true }
      const entityHandle = normalizeOptionalString(params.entityHandle)
      const sourceHandle = normalizeOptionalString(params.sourceHandle)

      if (entityHandle) {
        filter.targetEntity = { handle: entityHandle }
      }

      if (sourceHandle) {
        filter.source = { handle: sourceHandle }
      }

      const response = await ApiGenericService.find<ImportTemplateRecord>('importTemplate', {
        filter,
        orderBy: { title: 'ASC' },
        relations: ['source', 'targetEntity', 'valueMappings'],
        limit: 500,
      })
      return response.data.map(toImportTemplateSummary)
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async saveTemplate(payload: SaveImportTemplatePayload): Promise<ImportTemplateSummary> {
    try {
      const response = await axios.post<ImportTemplateSummary>(
        buildApiUrl('import/templates'),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async updateTemplate(
    handle: number,
    payload: SaveImportTemplatePayload,
  ): Promise<ImportTemplateSummary> {
    try {
      const response = await axios.patch<ImportTemplateSummary>(
        buildApiUrl(`import/templates/${handle}`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async analyzeCsv(file: File): Promise<ImportBatchSummary> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post<ImportBatchSummary>(
        buildApiUrl('import/batches/analyze'),
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async configureBatch(
    handle: number,
    payload: ConfigureImportBatchPayload,
  ): Promise<ImportBatchSummary> {
    try {
      const response = await axios.patch<ImportBatchSummary>(
        buildApiUrl(`import/batches/${handle}/configure`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async suggestBatchConfiguration(
    handle: number,
    payload: {
      entityHandle: string
      sourceHandle?: string | null
    },
  ): Promise<ImportAiSuggestion> {
    try {
      const response = await axios.post<ImportAiSuggestion>(
        buildApiUrl(`import/batches/${handle}/suggest`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async executeBatch(handle: number): Promise<ImportBatchSummary> {
    try {
      const response = await axios.post<ImportBatchSummary>(
        buildApiUrl(`import/batches/${handle}/execute`),
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async matchBatchExistingRecords(
    handle: number,
    payload: {
      entityHandle: string
      sourceColumns?: string[]
      targetFields?: string[]
      sampleLimit?: number | null
      limitPerValue?: number | null
    },
  ): Promise<ImportMatchResponse> {
    try {
      const response = await axios.post<ImportMatchResponse>(
        buildApiUrl(`import/batches/${handle}/match`),
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function extractHandle(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value : ''
  }

  const handle = (value as { handle?: unknown }).handle
  return typeof handle === 'string' ? handle : ''
}

function normalizeTemplateValueMappings(record: ImportTemplateRecord): ImportValueMapping[] {
  const entityMappings = getTemplateEntityValueMappings(record.valueMappings)
  if (entityMappings.length > 0) {
    return entityMappings
  }

  return Array.isArray(record.mapping?.valueMappings)
    ? record.mapping.valueMappings.filter(isImportValueMapping)
    : []
}

function getTemplateEntityValueMappings(
  valueMappings: ImportTemplateValueMappingRecord[] | undefined,
): ImportValueMapping[] {
  if (!Array.isArray(valueMappings)) {
    return []
  }

  const groupedMappings = new Map<string, ImportValueMapping>()

  for (const valueMapping of valueMappings) {
    const targetField = normalizeOptionalString(valueMapping.targetField)
    const sourceValue = normalizeOptionalString(valueMapping.sourceValue)
    const targetValue = typeof valueMapping.targetValue === 'string' ? valueMapping.targetValue : ''

    if (!targetField || !sourceValue) {
      continue
    }

    const fallback = normalizeValueMappingFallback(valueMapping.fallback)
    const key = `${targetField}|${fallback}`
    const existing = groupedMappings.get(key) ?? {
      targetField,
      values: {},
      fallback,
    }

    existing.values[sourceValue] = targetValue
    groupedMappings.set(key, existing)
  }

  return [...groupedMappings.values()]
}

function normalizeValueMappingFallback(value: unknown): ImportValueMappingFallback {
  return value === 'empty' || value === 'error' ? value : 'keep'
}

function isImportValueMapping(value: unknown): value is ImportValueMapping {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as ImportValueMapping).targetField === 'string' &&
    typeof (value as ImportValueMapping).values === 'object',
  )
}

function toImportTemplateSummary(record: ImportTemplateRecord): ImportTemplateSummary {
  return {
    handle: record.handle ?? null,
    title: record.title ?? '',
    description: record.description ?? null,
    sourceHandle: extractHandle(record.source),
    entityHandle: extractHandle(record.targetEntity),
    isActive: record.isActive !== false,
    mapping: {
      ...(record.mapping ?? {}),
      valueMappings: normalizeTemplateValueMappings(record),
    },
    externalKeyColumns: record.externalKeyColumns ?? null,
    genericReferenceMapping: record.genericReferenceMapping ?? null,
  }
}

export default ApiImportService
