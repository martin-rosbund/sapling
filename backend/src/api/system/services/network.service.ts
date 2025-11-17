import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class NetworkService {
  async getNetwork() {
    return await systeminformation.networkStats();
  }
}
