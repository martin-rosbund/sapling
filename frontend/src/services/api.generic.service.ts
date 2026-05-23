import axios from 'axios'
import type { ChangeLogEntry, PaginatedResponse, TimelineResponse } from '../entity/structure'
import { BACKEND_URL } from '@/constants/project.constants'
import { pushApiErrorMessage } from '@/services/api.error.service'

export type FilterQuery = { [key: string]: unknown }
export type OrderByQuery = { [key: string]: 'ASC' | 'DESC' | 1 | -1 | string }
export type EntityHandleValue = string | number
export type GenericUpdateConcurrencyResolution = 'detect' | 'merge' | 'overwrite'

export interface GenericUpdateConcurrency {
  expectedUpdatedAt?: string | Date | null
  basePayload?: Record<string, unknown> | null
  resolution?: GenericUpdateConcurrencyResolution
  merge?: boolean
  force?: boolean
}

export interface GenericUpdateConflictField {
  property: string
  baseValue?: unknown
  currentValue?: unknown
  attemptedValue?: unknown
  changedInCurrent: boolean
  changedInAttempt: boolean
  conflict: boolean
}

export interface GenericUpdateConflictLatestChange {
  handle?: string | number | null
  action?: string | null
  createdAt?: string | Date | null
  person?: Record<string, unknown> | null
}

export interface GenericUpdateConflictDetails {
  reason: 'staleRecord'
  entityHandle: string
  handle: EntityHandleValue
  expectedUpdatedAt?: string | null
  currentUpdatedAt?: string | null
  autoMergeable: boolean
  conflictingProperties: string[]
  mergeableProperties: string[]
  base?: Record<string, unknown> | null
  current?: Record<string, unknown> | null
  attempted?: Record<string, unknown> | null
  fields: GenericUpdateConflictField[]
  latestChange?: GenericUpdateConflictLatestChange | null
  summary?: string
}

interface FindOptions {
  filter?: FilterQuery
  orderBy?: OrderByQuery
  page?: number
  limit?: number
  relations?: string[]
  signal?: AbortSignal
}

interface UpdateOptions {
  relations?: string[]
  concurrency?: GenericUpdateConcurrency
  suppressConflictMessage?: boolean
}

interface TimelineOptions {
  before?: string
  months?: number
}

class ApiGenericService {
  static async downloadJSON<T>(
    entityHandle: string,
    {
      filter,
      orderBy,
      relations,
    }: { filter?: FilterQuery; orderBy?: OrderByQuery; relations?: string[] } = {},
  ): Promise<T[]> {
    const params: Record<string, unknown> = {}
    if (filter && Object.keys(filter).length > 0) params.filter = JSON.stringify(filter)
    if (orderBy && Object.keys(orderBy).length > 0) {
      params.orderBy = JSON.stringify(orderBy)
    }
    if (relations && relations.length > 0) {
      params.relations = relations.join(',')
    }

    try {
      const response = await axios.get<T[]>(`${BACKEND_URL}generic/${entityHandle}/download`, {
        params,
      })
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async find<T>(
    entityHandle: string,
    { filter, orderBy, page, limit, relations, signal }: FindOptions = {},
  ): Promise<PaginatedResponse<T>> {
    const params: Record<string, unknown> = {}
    if (typeof page === 'number') params.page = page
    if (typeof limit === 'number') params.limit = limit
    if (filter && Object.keys(filter).length > 0) {
      params.filter = JSON.stringify(filter)
    }
    if (orderBy && Object.keys(orderBy).length > 0) {
      params.orderBy = JSON.stringify(orderBy)
    }
    if (relations && relations.length > 0) {
      params.relations = JSON.stringify(relations)
    }

    try {
      const response = await axios.get<PaginatedResponse<T>>(
        `${BACKEND_URL}generic/${entityHandle}`,
        { params, signal },
      )
      return response.data
    } catch (error: unknown) {
      if (isRequestCanceled(error)) {
        throw error
      }

      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async getTimeline(
    entityHandle: string,
    handle: EntityHandleValue,
    { before, months }: TimelineOptions = {},
  ): Promise<TimelineResponse> {
    const params: Record<string, unknown> = {}

    if (before) {
      params.before = before
    }

    if (typeof months === 'number' && Number.isFinite(months)) {
      params.months = months
    }

    try {
      const response = await axios.get<TimelineResponse>(
        `${BACKEND_URL}generic/${entityHandle}/${handle}/timeline`,
        { params },
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async getChangeLog(
    entityHandle: string,
    handle: EntityHandleValue,
  ): Promise<ChangeLogEntry[]> {
    try {
      const response = await axios.get<ChangeLogEntry[]>(
        `${BACKEND_URL}generic/${entityHandle}/${handle}/change-log`,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async create<T>(entityHandle: string, data: Partial<T>): Promise<T> {
    try {
      const response = await axios.post<T>(`${BACKEND_URL}generic/${entityHandle}`, data)
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async update<T>(
    entityHandle: string,
    handle: EntityHandleValue,
    data: Partial<T>,
    { relations, concurrency, suppressConflictMessage }: UpdateOptions = {},
  ): Promise<T> {
    const params: Record<string, unknown> = {
      handle,
    }
    if (relations && relations.length > 0) {
      params.relations = JSON.stringify(relations)
    }
    if (concurrency?.expectedUpdatedAt) {
      params.expectedUpdatedAt =
        concurrency.expectedUpdatedAt instanceof Date
          ? concurrency.expectedUpdatedAt.toISOString()
          : concurrency.expectedUpdatedAt
    }
    if (concurrency?.merge === true || concurrency?.resolution === 'merge') {
      params.merge = true
    }

    const payload =
      concurrency?.basePayload ||
      concurrency?.resolution ||
      concurrency?.merge === true ||
      concurrency?.force === true
        ? {
            ...data,
            _saplingConcurrency: concurrency,
          }
        : data

    try {
      const response = await axios.patch<T>(`${BACKEND_URL}generic/${entityHandle}`, payload, {
        params,
      })
      return response.data
    } catch (error: unknown) {
      if (!(suppressConflictMessage && getGenericUpdateConflict(error))) {
        pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      }
      throw error
    }
  }

  static async delete(entityHandle: string, handle: EntityHandleValue): Promise<void> {
    const params: Record<string, unknown> = {
      handle,
    }

    try {
      await axios.delete(`${BACKEND_URL}generic/${entityHandle}`, { params })
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async createReference<T>(
    entityHandle: string,
    referenceName: string,
    entityRecordHandle: EntityHandleValue,
    referenceRecordHandle: EntityHandleValue,
  ): Promise<T> {
    const params: Record<string, unknown> = {
      entityHandle: entityRecordHandle,
      referenceHandle: referenceRecordHandle,
    }

    try {
      const response = await axios.post<T>(
        `${BACKEND_URL}generic/${entityHandle}/${referenceName}/create`,
        params,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async deleteReference<T>(
    entityHandle: string,
    referenceName: string,
    entityRecordHandle: EntityHandleValue,
    referenceRecordHandle: EntityHandleValue,
  ): Promise<T> {
    const params: Record<string, EntityHandleValue> = {
      entityHandle: entityRecordHandle,
      referenceHandle: referenceRecordHandle,
    }

    try {
      const response = await axios.post<T>(
        `${BACKEND_URL}generic/${entityHandle}/${referenceName}/delete`,
        params,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }
}

function isRequestCanceled(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ERR_CANCELED')
  )
}

export default ApiGenericService

export function getGenericUpdateConflict(error: unknown): GenericUpdateConflictDetails | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const response = (error as { response?: { status?: number; data?: unknown } }).response
  if (response?.status !== 409 || typeof response.data !== 'object' || response.data === null) {
    return null
  }

  const details = (response.data as { details?: unknown }).details
  if (typeof details !== 'object' || details === null) {
    return null
  }

  const conflict = details as Partial<GenericUpdateConflictDetails>
  return conflict.reason === 'staleRecord' && Array.isArray(conflict.fields)
    ? (conflict as GenericUpdateConflictDetails)
    : null
}
