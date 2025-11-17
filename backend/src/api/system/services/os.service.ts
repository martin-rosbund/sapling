import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class OsService {
  async getOs() {
    return await systeminformation.osInfo();
  }
}
