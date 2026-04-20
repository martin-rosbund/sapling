/**
 * @class SystemModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module providing system-related services and controller for system information endpoints.
 *
 * @property        {SystemController}     SystemController     Controller for system endpoints
 * @property        {CpuService}           CpuService           Service for CPU information
 * @property        {MemoryService}        MemoryService        Service for memory information
 * @property        {FilesystemService}    FilesystemService    Service for filesystem information
 * @property        {NetworkService}       NetworkService       Service for network information
 * @property        {OsService}            OsService            Service for operating system information
 * @property        {TimeService}          TimeService          Service for time information
 * @property        {VersionService}       VersionService       Service for application version information
 */
import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { CpuService } from './services/cpu.service';
import { MemoryService } from './services/memory.service';
import { FilesystemService } from './services/filesystem.service';
import { NetworkService } from './services/network.service';
import { OsService } from './services/os.service';
import { TimeService } from './services/time.service';
import { VersionService } from './services/version.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
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
