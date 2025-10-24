import axios from 'axios';
import type { PaginatedResponse } from '../entity/structure';

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
  allRelations?: boolean;
  relations?: string[];
}

class ApiGenericService {
  /**
   * Finds and retrieves a paginated list of entities.
   * @template T The type of entity to retrieve.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param filter Filter object for querying entities (MikroORM-compatible).
   * @param orderBy Order by object for sorting results (MikroORM-compatible).
   * @param page Page number to retrieve (default: 1).
   * @param limit Number of items per page (default: 1000).
   * @returns Promise resolving to a paginated response of entities.
   */
  static async find<T>(
    entityName: string,
    {filter, orderBy, page, limit, allRelations, relations }: FindOptions = {}
  ): Promise<PaginatedResponse<T>> {
  const params: Record<string, unknown> = {
      page,
      limit, 
      filter: JSON.stringify(filter),
      allRelations
    };
    if (orderBy && Object.keys(orderBy).length > 0) {
      params.orderBy = JSON.stringify(orderBy);
    }
    if (relations && Object.keys(relations).length > 0) {
      params.relations = JSON.stringify(relations);
    }
    try {
      const response = await axios.get<PaginatedResponse<T>>(
        `${import.meta.env.VITE_BACKEND_URL}generic/${entityName}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      throw error;
    }
  }

  /**
   * Creates a new entity record.
   * @template T The type of entity to create.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param data Partial object containing the data to create.
   * @returns Promise resolving to the created entity (including generated ID).
   */
  static async create<T>(entityName: string, data: Partial<T>): Promise<T> {
    const response = await axios.post<T>(
      `${import.meta.env.VITE_BACKEND_URL}generic/${entityName}`,
      data
    );
    return response.data;
  }

  /**
   * Updates an existing entity record.
   * @template T The type of entity to update.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param pk Object containing the primary key(s) of the entity (e.g., { id: 1 }).
   * @param data Partial object containing the data to update.
   * @returns Promise resolving to the updated entity.
   */
  static async update<T>(
    entityName: string,
    pk: Record<string, string | number>,
    data: Partial<T>
  ): Promise<T> {
    const response = await axios.patch<T>(
      `${import.meta.env.VITE_BACKEND_URL}generic/${entityName}`,
      data,
      { params: pk }
    );
    return response.data;
  }

  /**
   * Deletes an entity record.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @param pk Object containing the primary key(s) of the entity to delete (e.g., { id: 1 }).
   * @returns Promise resolving when the entity is deleted.
   */
  static async delete(
    entityName: string,
    pk: Record<string, string | number>
  ): Promise<void> {
    await axios.delete(`${import.meta.env.VITE_BACKEND_URL}generic/${entityName}`, {
      params: pk,
    });
  }
}

export default ApiGenericService;