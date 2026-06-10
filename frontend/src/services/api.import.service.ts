import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { pushApiErrorMessage } from '@/services/api.error.service'

export interface ImportFieldMapping {
  sourceColumn: string
  targetField: string
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
    relationMappings?: unknown[]
    valueMappings?: ImportValueMapping[]
  } | null
  externalKeyColumns: string[] | null
  genericReferenceMapping: ImportGenericReferenceMapping | null
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
  filename: string
  mimetype?: string | null
  fileSize?: number | null
  sourceHandle?: string | null
  entityHandle?: string | null
  templateHandle?: number | null
  rowCount: number
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
    relationMappings?: unknown[]
    valueMappings?: ImportValueMapping[]
  } | null
  externalKeyColumns?: string[] | null
  genericReferenceMapping?: object | null
  executedAt?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  rows: ImportBatchRowSummary[]
}

class ApiImportService {
  static async listTemplates(params: {
    entityHandle?: string | null
    sourceHandle?: string | null
  }): Promise<ImportTemplateSummary[]> {
    try {
      const response = await axios.get<ImportTemplateSummary[]>(`${BACKEND_URL}import/templates`, {
        params,
      })
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }

  static async saveTemplate(payload: SaveImportTemplatePayload): Promise<ImportTemplateSummary> {
    try {
      const response = await axios.post<ImportTemplateSummary>(
        `${BACKEND_URL}import/templates`,
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
        `${BACKEND_URL}import/batches/analyze`,
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
        `${BACKEND_URL}import/batches/${handle}/configure`,
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
        `${BACKEND_URL}import/batches/${handle}/suggest`,
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
        `${BACKEND_URL}import/batches/${handle}/execute`,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'import')
      throw error
    }
  }
}

export default ApiImportService
