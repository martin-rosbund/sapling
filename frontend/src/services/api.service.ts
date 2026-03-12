import { BACKEND_URL } from '@/constants/project.constants';
import axios from 'axios';

/**
 * API service for basic entity operations (find all, find one).
 * Provides methods to fetch all or a single entity from a REST endpoint.
 */
class ApiService {
  /**
   * Fetches all entities from the given endpoint.
   * @template T The type of entity to fetch.
   * @param entityName Name of the entity endpoint (e.g., 'user').
   * @returns Promise resolving to the array or object of entities.
   */
  static async findAll<T>(entityName: string): Promise<T> {
    try {
      const response = await axios.get<T>(
        `${BACKEND_URL}${entityName}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      throw error;
    }
  }

  /**
   * Fetches a single entity from the given endpoint.
   * @template T The type of entity to fetch.
   * @param entityName Name of the entity endpoint (e.g., 'user/1').
   * @returns Promise resolving to the entity object.
   */
  static async findOne<T>(entityName: string): Promise<T> {
    try {
      const response = await axios.get<T>(
        `${BACKEND_URL}${entityName}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      throw error;
    }
  }
    /**
     * Uploads a document for an entity.
     * @param entityName Name of the entity (e.g., 'company').
     * @param reference Reference handle (item.handle).
     * @param formData FormData with file, typeHandle, description.
     */
    static async uploadDocument(entityName: string, reference: string, formData: FormData): Promise<unknown> {
      try {
        const url = `${BACKEND_URL}document/upload/${entityName}/${reference}`;
        const response = await axios.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
      }
    }
}

export default ApiService;