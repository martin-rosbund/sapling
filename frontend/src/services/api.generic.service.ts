import axios from 'axios';
import type { PaginatedResponse } from '../entity/structure';
import { BACKEND_URL } from '@/constants/project.constants';
import { useMessageCenter } from '@/composables/system/useMessageCenter';

export type FilterQuery = { [key: string]: unknown };
export type OrderByQuery = { [key: string]: 'ASC' | 'DESC' | 1 | -1 | string };

/**
 * Generic API service for CRUD operations on any entity.
 * Provides methods to find, create, update, and delete entities using REST endpoints.
 */
interface FindOptions {
  filter?: FilterQuery;
  orderBy?: OrderByQuery;
  page?: number;
  limit?: number;
  relations?: string[];
}

interface UpdateOptions {
  relations?: string[];
}

const messageCenter = useMessageCenter();

class ApiGenericService {
  // #region Find
  /**
   * Finds and retrieves a paginated list of entities.
   * @template T The type of entity to retrieve.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param options Options for filtering, sorting, pagination, and relations.
   * @returns Promise resolving to a paginated response of entities.
   */
  static async find<T>(
    entityName: string,
    {filter, orderBy, page, limit, relations }: FindOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const params: Record<string, unknown> = {
      page,
      limit, 
      filter: JSON.stringify(filter)
    };
    if (orderBy && Object.keys(orderBy).length > 0) {
      params.orderBy = JSON.stringify(orderBy);
    }
    if (relations && Object.keys(relations).length > 0) {
      params.relations = JSON.stringify(relations);
    }
    try {
      const response = await axios.get<PaginatedResponse<T>>(
        `${BACKEND_URL}generic/${entityName}`,
        { params }
      );
      return response.data;
    } catch (error: unknown) {
      let message = 'global.unknownError';
      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } }, message?: string };
        message = err.response?.data?.message || err.message || message;
      }
      messageCenter.pushMessage('error', message, entityName);
      throw error;
    }
  }
  // #endregion

  // #region Create
  /**
   * Creates a new entity record.
   * @template T The type of entity to create.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param data Partial object containing the data to create.
   * @returns Promise resolving to the created entity (including generated ID).
   */
  static async create<T>(entityName: string, data: Partial<T>): Promise<T> {
    try {
      const response = await axios.post<T>(
        `${BACKEND_URL}generic/${entityName}`,
        data
      );
      return response.data;
    } catch (error: unknown) {
      let msg = 'global.unknownError';
      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } }, message?: string };
        msg = err.response?.data?.message || err.message || msg;
      }
      messageCenter.pushMessage('error', msg, entityName);
      throw error;
    }
  }
  // #endregion

  // #region Update
  /**
   * Updates an existing entity record.
   * @template T The type of entity to update.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param primaryKeys Object containing the primary key(s) of the entity (e.g., { id: 1 }).
   * @param data Partial object containing the data to update.
   * @returns Promise resolving to the updated entity.
   */
  static async update<T>(
    entityName: string,
    primaryKeys: Record<string, string | number>,
    data: Partial<T>,
    { relations }: UpdateOptions = {}
  ): Promise<T> {
    const params: Record<string, unknown> = {
      ...primaryKeys,
      relations: JSON.stringify(relations),
    };
    try {
      const response = await axios.patch<T>(
        `${BACKEND_URL}generic/${entityName}`,
        data,
        { params }
      );
      return response.data;
    } catch (error: unknown) {
      let message = 'global.unknownError';
      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } }, message?: string };
        message = err.response?.data?.message || err.message || message;
      }
      messageCenter.pushMessage('error', message, entityName);
      throw error;
    }
  }
  // #endregion

  // #region Delete
  /**
   * Deletes an entity record.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param primaryKeys Object containing the primary key(s) of the entity to delete (e.g., { id: 1 }).
   * @returns Promise resolving when the entity is deleted.
   */
  static async delete(
    entityName: string,
    primaryKeys: Record<string, string | number>
  ): Promise<void> {
    const params: Record<string, unknown> = {
      ...primaryKeys,
    };
    try {
      await axios.delete(`${BACKEND_URL}generic/${entityName}`, { params });
    } catch (error: unknown) {
      let message = 'global.unknownError';
      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } }, message?: string };
        message = err.response?.data?.message || err.message || message;
      }
      messageCenter.pushMessage('error', message, entityName);
      throw error;
    }
  }
  // #endregion

  // #region Create Reference
  /** 
   * Creates a reference between two entities in a many-to-many relationship.
   * @param entityName Name of the primary entity endpoint (e.g., 'user').
   * @param referenceName Name of the reference entity endpoint (e.g., 'role').
   * @param entityPrimaryKeys Object containing the primary key(s) of the primary entity (e.g., { id: 1 }).
   * @param referencePrimaryKeys Object containing the primary key(s) of the reference entity (e.g., { id: 2 }).
   * @returns Promise resolving to the created reference entity.
   */
  static async createReference<T>(
    entityName: string,
    referenceName: string,
    entityPrimaryKeys: Record<string, string | number>,
    referencePrimaryKeys: Record<string, string | number>
  ): Promise<T> {
    const params: Record<string, unknown> = {
      entityPrimaryKeys,
      referencePrimaryKeys,
    };
    try {
      const response = await axios.post<T>(
        `${BACKEND_URL}generic/${entityName}/${referenceName}/create`,
        params 
      );
      return response.data;
    } catch (error: unknown) {
      let message = 'global.unknownError';
      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } }, message?: string };
        message = err.response?.data?.message || err.message || message;
      }
      messageCenter.pushMessage('error', message, entityName);
      throw error;
    }
  }
  // #endregion

  // #region Delete Reference
  /** 
   * Deletes a reference between two entities in a many-to-many relationship.
   * @param entityName Name of the primary entity endpoint (e.g., 'user').
   * @param referenceName Name of the reference entity endpoint (e.g., 'role').
   * @param entityPrimaryKeys Object containing the primary key(s) of the primary entity (e.g., { id: 1 }).
   * @param referencePrimaryKeys Object containing the primary key(s) of the reference entity (e.g., { id: 2 }).
   * @returns Promise resolving to the deleted reference entity.
   */
  static async deleteReference<T>(
    entityName: string,
    referenceName: string,
    entityPrimaryKeys: Record<string, string | number>,
    referencePrimaryKeys: Record<string, string | number>
  ): Promise<T> {
    const params: Record<string, Record<string, string | number>> = {
      entityPrimaryKeys,
      referencePrimaryKeys,
    };
    try {
      const response = await axios.post<T>(
        `${BACKEND_URL}generic/${entityName}/${referenceName}/delete`,
        params
      );
      return response.data;
    } catch (error: unknown) {
      let message = 'global.unknownError';
      if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } }, message?: string };
        message = err.response?.data?.message || err.message || message;
      }
      messageCenter.pushMessage('error', message, entityName);
      throw error;
    }
  } 
  // #endregion
}

export default ApiGenericService;