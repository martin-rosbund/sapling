import axios from 'axios'
import type { PaginatedResponse } from '../entity/structure'
import { BACKEND_URL } from '@/constants/project.constants'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

export type FilterQuery = { [key: string]: unknown }
export type OrderByQuery = { [key: string]: 'ASC' | 'DESC' | 1 | -1 | string }
export type EntityHandleValue = string | number

/**
 * Generic API service for CRUD operations on any entity.
 * Provides methods to find, create, update, and delete entities using REST endpoints.
 */
interface FindOptions {
  filter?: FilterQuery
  orderBy?: OrderByQuery
  page?: number
  limit?: number
  relations?: string[]
}

interface UpdateOptions {
  relations?: string[]
}

const messageCenter = useSaplingMessageCenter()

class ApiGenericService {
  // #region Download JSON
  /**
   * Downloads entity data as JSON (no scripting, no count).
   * @param entityHandle Name of the entity endpoint (e.g., 'user').
   * @param options Options for filtering, sorting, and relations.
   * @returns Promise resolving to the entity data as JSON.
   */
  static async downloadJSON<T>(
    entityHandle: string,
    {
      filter,
      orderBy,
      relations,
    }: { filter?: FilterQuery; orderBy?: OrderByQuery; relations?: string[] } = {},
  ): Promise<T[]> {
    const params: Record<string, unknown> = {}
    if (filter) params.filter = JSON.stringify(filter)
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
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion
  // #region Find
  /**
   * Finds and retrieves a paginated list of entities.
   * @template T The type of entity to retrieve.
   * @param entityHandle Name of the entity endpoint (e.g., 'user').
   * @param options Options for filtering, sorting, pagination, and relations.
   * @returns Promise resolving to a paginated response of entities.
   */
  static async find<T>(
    entityHandle: string,
    { filter, orderBy, page, limit, relations }: FindOptions = {},
  ): Promise<PaginatedResponse<T>> {
    const params: Record<string, unknown> = {
      page,
      limit,
      filter: JSON.stringify(filter),
    }
    if (orderBy && Object.keys(orderBy).length > 0) {
      params.orderBy = JSON.stringify(orderBy)
    }
    if (relations && Object.keys(relations).length > 0) {
      params.relations = JSON.stringify(relations)
    }
    try {
      const response = await axios.get<PaginatedResponse<T>>(
        `${BACKEND_URL}generic/${entityHandle}`,
        { params },
      )
      return response.data
    } catch (error: unknown) {
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion

  // #region Create
  /**
   * Creates a new entity record.
   * @template T The type of entity to create.
   * @param entityHandle Name of the entity endpoint (e.g., 'user').
   * @param data Partial object containing the data to create.
   * @returns Promise resolving to the created entity (including generated ID).
   */
  static async create<T>(entityHandle: string, data: Partial<T>): Promise<T> {
    try {
      const response = await axios.post<T>(`${BACKEND_URL}generic/${entityHandle}`, data)
      return response.data
    } catch (error: unknown) {
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion

  // #region Update
  /**
   * Updates an existing entity record.
   * @template T The type of entity to update.
   * @param entityHandle Name of the entity endpoint (e.g., 'user').
   * @param handle Handle of the entity to update.
   * @param data Partial object containing the data to update.
   * @returns Promise resolving to the updated entity.
   */
  static async update<T>(
    entityHandle: string,
    handle: EntityHandleValue,
    data: Partial<T>,
    { relations }: UpdateOptions = {},
  ): Promise<T> {
    const params: Record<string, unknown> = {
      handle,
      relations: JSON.stringify(relations),
    }
    try {
      const response = await axios.patch<T>(`${BACKEND_URL}generic/${entityHandle}`, data, {
        params,
      })
      return response.data
    } catch (error: unknown) {
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion

  // #region Delete
  /**
   * Deletes an entity record.
   * @param entityHandle Name of the entity endpoint (e.g., 'user').
   * @param handle Handle of the entity to delete.
   * @returns Promise resolving when the entity is deleted.
   */
  static async delete(entityHandle: string, handle: EntityHandleValue): Promise<void> {
    const params: Record<string, unknown> = {
      handle,
    }
    try {
      await axios.delete(`${BACKEND_URL}generic/${entityHandle}`, { params })
    } catch (error: unknown) {
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion

  // #region Create Reference
  /**
   * Creates a reference between two entities in a many-to-many relationship.
   * @param entityHandle Name of the primary entity endpoint (e.g., 'user').
   * @param referenceName Name of the reference entity endpoint (e.g., 'role').
   * @param entityRecordHandle Handle of the primary entity.
   * @param referenceRecordHandle Handle of the reference entity.
   * @returns Promise resolving to the created reference entity.
   */
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
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion

  // #region Delete Reference
  /**
   * Deletes a reference between two entities in a many-to-many relationship.
   * @param entityHandle Name of the primary entity endpoint (e.g., 'user').
   * @param referenceName Name of the reference entity endpoint (e.g., 'role').
   * @param entityRecordHandle Handle of the primary entity.
   * @param referenceRecordHandle Handle of the reference entity.
   * @returns Promise resolving to the deleted reference entity.
   */
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
      let message = 'exception.unknownError'
      let description = ''
      if (typeof error === 'object' && error !== null) {
        const err = error as {
          response?: { data?: { message?: string; error?: string } }
          message?: string
        }
        message = err.response?.data?.message || err.message || message
        description = err.response?.data?.error || ''
      }
      messageCenter.pushMessage('error', message, description, entityHandle)
      throw error
    }
  }
  // #endregion
}

export default ApiGenericService
