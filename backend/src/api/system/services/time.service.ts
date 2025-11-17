import { Injectable } from '@nestjs/common';
import systeminformation from 'systeminformation';

@Injectable()
export class TimeService {
  async getTime() {
    return await systeminformation.time();
  }
}
