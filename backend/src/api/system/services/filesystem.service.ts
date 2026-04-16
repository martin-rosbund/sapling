/**
 * @class FilesystemService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing filesystem information using systeminformation library.
 */
import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class FilesystemService {
  /**
   * Returns filesystem information.
   * @returns {Promise<object>} Filesystem information object
   */
  async getFilesystem() {
    return await systeminformation.fsSize();
  }
}
