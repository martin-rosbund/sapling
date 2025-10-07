import { Injectable } from '@nestjs/common';
const { version } = require('../package.json');

@Injectable()
export class AppService {
  getVersion(): string {
    return version;
  }
}
