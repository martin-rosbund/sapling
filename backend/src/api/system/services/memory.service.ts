import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class MemoryService {
  async getMemory() {
    return await systeminformation.mem();
  }
}
