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
    filter: FilterQuery = {},
    orderBy: OrderByQuery = {},
    page: number = 1,
    limit: number = 1000
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
        `${import.meta.env.VITE_BACKEND_URL}${entityName}`,
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
      const response = await axios.get<T>(
        `${import.meta.env.VITE_BACKEND_URL}${entityName}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityName}:`, error);
      throw error;
    }
  }
  static async findOne<T>(entityName: string): Promise<T> {
    try {
      const response = await axios.get<T>(
        `${import.meta.env.VITE_BACKEND_URL}${entityName}`
      );
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
    const response = await axios.post<T>(
      `${import.meta.env.VITE_BACKEND_URL}${entityName}`,
      data
    );
    return response.data;
  }

  /**
   * Aktualisiert einen bestehenden Eintrag.
   * @param entityName - Der Name des Endpunkts.
   * @param pk - Die Primary Keys des Eintrags als Objekt (z.B. { id: 1 }).
   * @param data - Die zu aktualisierenden Daten.
   * @returns Das vollständige, aktualisierte Objekt.
   */
  static async update<T>(
    entityName: string,
    pk: Record<string, string | number>,
    data: Partial<T>
  ): Promise<T> {
    const response = await axios.patch<T>(
      `${import.meta.env.VITE_BACKEND_URL}${entityName}`,
      data,
      { params: pk }
    );
    return response.data;
  }

  /**
   * Löscht einen Eintrag.
   * @param entityName - Der Name des Endpunkts.
   * @param pk - Die Primary Keys des zu löschenden Eintrags als Objekt (z.B. { id: 1 }).
   */
  static async delete(
    entityName: string,
    pk: Record<string, string | number>
  ): Promise<void> {
    await axios.delete(`${import.meta.env.VITE_BACKEND_URL}${entityName}`, {
      params: pk,
    });
  }
}

export default ApiService;