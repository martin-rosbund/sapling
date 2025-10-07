import axios from 'axios';
import type { PaginatedResponse } from '../entity/structure';

export type FilterQuery = { [key: string]: any };

class ApiService<T> {
  private entityName: string;
  private baseUrl: string = import.meta.env.VITE_BACKEND_API;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  /**
   * Finds and retrieves a paginated list of entities.
   * @param page - The page number to retrieve.
   * @param limit - The number of items per page.
   * @param filter - A MikroORM-compatible filter object.
   * @returns A promise that resolves to a paginated response.
   */
  async find(page: number = 1, limit: number = 10, filter: FilterQuery = {}): Promise<PaginatedResponse<T>> {
    const params = {
      page,
      limit,
      filter: JSON.stringify(filter),
    };

    try {
      const response = await axios.get<PaginatedResponse<T>>(`${this.baseUrl}${this.entityName}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${this.entityName}:`, error);
      // You might want to handle errors more gracefully
      throw error;
    }
  }
  
  /**
   * Erstellt einen neuen Eintrag.
   * @param data - Das Objekt, das erstellt werden soll.
   * @returns Das vom Server erstellte Objekt (inkl. ID).
   */
  async create(data: Partial<T>): Promise<T> {
    const response = await axios.post<T>(`${this.baseUrl}${this.entityName}`, data);
    return response.data;
  }

  /**
   * Aktualisiert einen bestehenden Eintrag.
   * @param id - Die ID des Eintrags, der aktualisiert werden soll.
   * @param data - Die zu aktualisierenden Daten.
   * @returns Das vollständige, aktualisierte Objekt.
   */
  async update(id: string | number, data: Partial<T>): Promise<T> {
    const response = await axios.patch<T>(`${this.baseUrl}${this.entityName}/${id}`, data);
    return response.data;
  }

  /**
   * Löscht einen Eintrag.
   * @param id - Die ID des zu löschenden Eintrags.
   */
  async delete(id: string | number): Promise<void> {
    await axios.delete(`${this.baseUrl}${this.entityName}/${id}`);
  }
}

export default ApiService;