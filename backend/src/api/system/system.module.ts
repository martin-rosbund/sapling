import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { CpuService } from './services/cpu.service';
import { MemoryService } from './services/memory.service';
import { FilesystemService } from './services/filesystem.service';
import { NetworkService } from './services/network.service';
import { OsService } from './services/os.service';
import { TimeService } from './services/time.service';
import { VersionService } from './services/version.service';

@Module({
  controllers: [SystemController],
  providers: [
    CpuService,
    MemoryService,
    FilesystemService,
    NetworkService,
    OsService,
    TimeService,
    VersionService,
  ],
})
export class SystemModule {}
