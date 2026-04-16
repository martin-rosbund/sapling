/**
 * @class OsService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing operating system information using systeminformation library.
 */
import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class OsService {
  /**
   * Returns operating system information.
   * @returns {Promise<object>} Operating system information object
   */
  async getOs() {
    return await systeminformation.osInfo();
  }
}
