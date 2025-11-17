import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class CpuService {
  async getCpu() {
    return await systeminformation.cpu();
  }
  async getCpuSpeed() {
    return await systeminformation.currentLoad();
  }
}
