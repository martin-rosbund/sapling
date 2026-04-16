/**
 * @class VersionService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing application version information from package.json.
 */
import { Injectable } from '@nestjs/common';
import { ApplicationVersionDto } from '../dto/version.dto';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class VersionService {
  /**
   * Returns application version information.
   * Reads the version from package.json.
   * @returns {ApplicationVersionDto} Application version DTO
   */
  getVersion(): ApplicationVersionDto {
    const packageJsonPath = join(__dirname, '../../../../package.json');
    const fileContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(fileContent) as Partial<{ version: string }>;

    return { version: packageJson.version ? packageJson.version : '0.0.0' };
  }
}
