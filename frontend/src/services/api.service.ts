import axios from 'axios';
import type { PaginatedResponse } from '../entity/structure';

export type FilterQuery = { [key: string]: unknown };
export type OrderByQuery = { [key: string]: 'ASC' | 'DESC' | 1 | -1 | string };

class ApiService {
  /**
   * Finds and retrieves a paginated list of entities.
   * @param entityName - The name of the entity endpoint.
   * @param page - The page number to retrieve.
   * @param limit - The number of items per page.
   * @param filter - A MikroORM-compatible filter object.
   * @param orderBy - A MikroORM-compatible orderBy object.
   * @returns A promise that resolves to a paginated response.
   */
  static async find<T>(
    entityName: string,
    page: number = 1,
    limit: number = 1000,
    filter: FilterQuery = {},
    orderBy: OrderByQuery = {}
  ): Promise<PaginatedResponse<T>> {
    const params: Record<string, any> = {
      page,
      limit,
      filter: JSON.stringify(filter),
    };
    if (orderBy && Object.keys(orderBy).length > 0) {
      params.orderBy = JSON.stringify(orderBy);
    }
    try {
      const response = await axios.get<PaginatedResponse<T>>(
        `${import.meta.env.VITE_BACKEND_API}${entityName}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      throw error;
    }
  }

  static async findAll<T>(entityName: string): Promise<T> {
    try {
      const response = await axios.get<T>(`${import.meta.env.VITE_BACKEND_API}${entityName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      throw error;
    }
  }
  /**
   * Erstellt einen neuen Eintrag.
   * @param entityName - Der Name des Endpunkts.
   * @param data - Das Objekt, das erstellt werden soll.
   * @returns Das vom Server erstellte Objekt (inkl. ID).
   */
  static async create<T>(entityName: string, data: Partial<T>): Promise<T> {
    const response = await axios.post<T>(`${import.meta.env.VITE_BACKEND_API}${entityName}`, data);
    return response.data;
  }

  /**
   * Aktualisiert einen bestehenden Eintrag.
   * @param entityName - Der Name des Endpunkts.
   * @param id - Die ID des Eintrags, der aktualisiert werden soll.
   * @param data - Die zu aktualisierenden Daten.
   * @returns Das vollständige, aktualisierte Objekt.
   */
  static async update<T>(entityName: string, id: string | number, data: Partial<T>): Promise<T> {
    const response = await axios.patch<T>(`${import.meta.env.VITE_BACKEND_API}${entityName}/${id}`, data);
    return response.data;
  }

  /**
   * Löscht einen Eintrag.
   * @param entityName - Der Name des Endpunkts.
   * @param id - Die ID des zu löschenden Eintrags.
   */
  static async delete(entityName: string, id: string | number): Promise<void> {
    await axios.delete(`${import.meta.env.VITE_BACKEND_API}${entityName}/${id}`);
  }
}

export default ApiService;