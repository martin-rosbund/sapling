/**
 * @class NetworkService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing network information using systeminformation library.
 */
import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class NetworkService {
  /**
   * Returns network statistics information.
   * @returns {Promise<object>} Network statistics object
   */
  async getNetwork() {
    return await systeminformation.networkStats();
  }
}
