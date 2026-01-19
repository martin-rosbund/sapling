import { Injectable } from '@nestjs/common';
import { ApplicationVersionDto } from '../dto/version.dto';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class VersionService {
  getVersion(): ApplicationVersionDto {
    const packageJsonPath = join(__dirname, '../package.json');
    const fileContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(fileContent) as Partial<{ version: string }>;

    return { version: packageJson.version ? packageJson.version : '0.0.0' };
  }
}
