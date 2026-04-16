/**
 * @class CpuService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing CPU information using systeminformation library.
 */
import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class CpuService {
  /**
   * Returns CPU information.
   * @returns {Promise<object>} CPU information object
   */
  async getCpu() {
    return await systeminformation.cpu();
  }

  /**
   * Returns current CPU load and speed information.
   * @returns {Promise<object>} CPU load object
   */
  async getCpuSpeed() {
    return await systeminformation.currentLoad();
  }
}
