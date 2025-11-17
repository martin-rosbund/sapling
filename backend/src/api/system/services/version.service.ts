import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class VersionService {
  getVersion(): string {
    const pkg: { version: string } = JSON.parse(
      readFileSync(join(__dirname, '../../../../package.json'), 'utf8'),
    ) as { version: string };
    return pkg.version;
  }
}
