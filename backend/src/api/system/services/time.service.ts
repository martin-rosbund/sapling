/**
 * @class TimeService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing time information using systeminformation library.
 */
import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class TimeService {
  /**
   * Returns time information.
   * @returns {object} Time information object
   */
  getTime() {
    return systeminformation.time();
  }
}
