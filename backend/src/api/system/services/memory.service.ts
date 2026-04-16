/**
 * @class MemoryService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing memory information using systeminformation library.
 */
import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class MemoryService {
  /**
   * Returns memory information.
   * @returns {Promise<object>} Memory information object
   */
  async getMemory() {
    return await systeminformation.mem();
  }
}
