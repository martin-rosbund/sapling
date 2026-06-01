import { BACKEND_URL } from '@/constants/project.constants'
import axios from 'axios'
import { pushApiErrorMessage } from '@/services/api.error.service'

/**
 * API service for basic entity operations (find all, find one).
 * Provides methods to fetch all or a single entity from a REST endpoint.
 */
class ApiService {
  /**
   * Fetches all entities from the given endpoint.
   * @template T The type of entity to fetch.
   * @param entityHandle Name of the entity endpoint (e.g., 'user').
   * @returns Promise resolving to the array or object of entities.
   */
  static async findAll<T>(entityHandle: string): Promise<T> {
    try {
      const response = await axios.get<T>(`${BACKEND_URL}${entityHandle}`)
      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  /**
   * Fetches a single entity from the given endpoint.
   * @template T The type of entity to fetch.
   * @param entityHandle Name of the entity endpoint (e.g., 'user/1').
   * @returns Promise resolving to the entity object.
   */
  static async findOne<T>(entityHandle: string): Promise<T> {
    try {
      const response = await axios.get<T>(`${BACKEND_URL}${entityHandle}`)
      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  /**
   * Sends a POST request to the given endpoint.
   * @template T The expected response type.
   * @param entityHandle Name of the endpoint relative to the backend base URL.
   * @param body Optional request body.
   * @returns Promise resolving to the response payload.
   */
  static async post<T>(entityHandle: string, body?: unknown): Promise<T> {
    try {
      const response = await axios.post<T>(`${BACKEND_URL}${entityHandle}`, body)
      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  /**
   * Sends a PATCH request to the given endpoint.
   * @template T The expected response type.
   * @param entityHandle Name of the endpoint relative to the backend base URL.
   * @param body Optional request body.
   * @returns Promise resolving to the response payload.
   */
  static async patch<T>(entityHandle: string, body?: unknown): Promise<T> {
    try {
      const response = await axios.patch<T>(`${BACKEND_URL}${entityHandle}`, body)
      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  /**
   * Uploads a document for an entity.
   * @param entityHandle Name of the entity (e.g., 'company').
   * @param reference Reference handle (item.handle).
   * @param formData FormData with file, typeHandle, description.
   */
  static async uploadDocument(
    entityHandle: string,
    reference: string,
    formData: FormData,
  ): Promise<unknown> {
    try {
      const url = `${BACKEND_URL}document/upload/${entityHandle}/${reference}`
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }
}

export default ApiService
