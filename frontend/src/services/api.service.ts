import axios from 'axios';

class ApiService {
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
}

export default ApiService;