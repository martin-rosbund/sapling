import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class FilesystemService {
  async getFilesystem() {
    return await systeminformation.fsSize();
  }
}
