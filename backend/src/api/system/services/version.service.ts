import { Injectable } from '@nestjs/common';
import { SAPLING_VERSION } from '../../../constants/project.constants';
import { ApplicationVersionDto } from '../dto/version.dto';

@Injectable()
export class VersionService {
  getVersion(): ApplicationVersionDto {
    return  { version: SAPLING_VERSION };
  }
}
