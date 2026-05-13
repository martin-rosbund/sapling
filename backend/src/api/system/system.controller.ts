import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CpuDto } from './dto/cpu.dto';
import { CpuSpeedDto } from './dto/cpuspeed.dto';
import { MemoryDto } from './dto/memory.dto';
import { FilesystemDto } from './dto/filesystem.dto';
import { OperatingSystemDto } from './dto/os.dto';
import { TimeDto } from './dto/time.dto';
import { NetworkInterfaceDto } from './dto/network.dto';
import { ApplicationVersionDto } from './dto/version.dto';
import { ApplicationStateDto } from './dto/state.dto';
import { CpuService } from './services/cpu.service';
import { MemoryService } from './services/memory.service';
import { FilesystemService } from './services/filesystem.service';
import { NetworkService } from './services/network.service';
import { OsService } from './services/os.service';
import { TimeService } from './services/time.service';
import { VersionService } from './services/version.service';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import { AdminPermissionGuard } from '../../auth/guard/admin-permission.guard';
import { AdminPermission } from '../../auth/admin-permission';

/**
 * @class SystemController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller providing system information endpoints such as CPU, memory, filesystem, network, OS, time, version, and application state.
 *
 * @property        {CpuService}           cpuService           Service for CPU information
 * @property        {MemoryService}        memoryService        Service for memory information
 * @property        {FilesystemService}    filesystemService    Service for filesystem information
 * @property        {NetworkService}       networkService       Service for network information
 * @property        {OsService}            osService            Service for operating system information
 * @property        {TimeService}          timeService          Service for time information
 * @property        {VersionService}       versionService       Service for application version information
 */
@ApiTags('System')
@ApiExtraModels(
  CpuDto,
  CpuSpeedDto,
  MemoryDto,
  FilesystemDto,
  OperatingSystemDto,
  TimeDto,
  NetworkInterfaceDto,
  ApplicationVersionDto,
  ApplicationStateDto,
)
@Controller('api/system')
@AdminPermission()
@UseGuards(SessionOrBearerAuthGuard, AdminPermissionGuard)
export class SystemController {
  /**
   * Creates an instance of SystemController.
   * @param {MemoryService} memoryService Service for memory information
   * @param {FilesystemService} filesystemService Service for filesystem information
   * @param {NetworkService} networkService Service for network information
   * @param {OsService} osService Service for operating system information
   * @param {TimeService} timeService Service for time information
   * @param {VersionService} versionService Service for application version information
   */
  constructor(
    private readonly cpuService: CpuService,
    private readonly memoryService: MemoryService,
    private readonly filesystemService: FilesystemService,
    private readonly networkService: NetworkService,
    private readonly osService: OsService,
    private readonly timeService: TimeService,
    private readonly versionService: VersionService,
  ) {}

  /**
   * Returns CPU information.
   * @returns {Promise<CpuDto>} CPU information DTO
   */
  @Get('cpu')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get CPU information',
    description:
      'Returns aggregated processor details for the current Sapling server, including model, core count, and architecture-related metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'CPU information for the current Sapling server.',
    type: CpuDto,
  })
  async getCpu(): Promise<CpuDto> {
    return await this.cpuService.getCpu();
  }

  /**
   * Returns CPU speed information.
   * @returns {Promise<CpuSpeedDto>} CPU speed DTO
   */
  @Get('cpu/speed')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get CPU speed information',
    description:
      'Returns the current, minimum, and maximum CPU frequency values reported by the system.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Measured CPU speed information for the current Sapling server.',
    type: CpuSpeedDto,
  })
  async getCpuSpeed(): Promise<CpuSpeedDto> {
    return await this.cpuService.getCpuSpeed();
  }

  /**
   * Returns memory information.
   * @returns {Promise<MemoryDto>} Memory information DTO
   */
  @Get('memory')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get memory information',
    description:
      'Returns total, used, and available memory values for the current Sapling server.',
  })
  @ApiResponse({
    status: 200,
    description: 'Memory usage information for the current Sapling server.',
    type: MemoryDto,
  })
  async getMemory(): Promise<MemoryDto> {
    return await this.memoryService.getMemory();
  }

  /**
   * Returns filesystem information.
   * @returns {Promise<FilesystemDto[]>} Array of filesystem DTOs
   */
  @Get('filesystem')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get filesystem information',
    description:
      'Returns mounted filesystems together with size, usage, and mount-point information.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Filesystem information for all mounted volumes visible to the server.',
    type: FilesystemDto,
    isArray: true,
  })
  async getFilesystem(): Promise<FilesystemDto[]> {
    return await this.filesystemService.getFilesystem();
  }

  /**
   * Returns network information.
   * @returns {Promise<NetworkInterfaceDto[]>} Array of network interface DTOs
   */
  @Get('network')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get network interface information',
    description:
      'Returns the network interfaces reported by the server, including address and adapter details.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Network interface information for the current Sapling server.',
    type: NetworkInterfaceDto,
    isArray: true,
  })
  async getNetwork(): Promise<NetworkInterfaceDto[]> {
    return await this.networkService.getNetwork();
  }

  /**
   * Returns operating system information.
   * @returns {Promise<OperatingSystemDto>} Operating system DTO
   */
  @Get('os')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get operating system information',
    description:
      'Returns operating system and platform metadata for the current Sapling server.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operating system information for the current Sapling server.',
    type: OperatingSystemDto,
  })
  async getOs(): Promise<OperatingSystemDto> {
    return await this.osService.getOs();
  }

  /**
   * Returns time information.
   * @returns {Promise<TimeDto>} Time DTO
   */
  @Get('time')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get server time information',
    description:
      'Returns the current server time together with timezone-related metadata used by the backend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current time information reported by the Sapling server.',
    type: TimeDto,
  })
  getTime(): TimeDto {
    return this.timeService.getTime();
  }

  /**
   * Returns application version information.
   * @returns {ApplicationVersionDto} Application version DTO
   */
  @Get('version')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get application version information',
    description:
      'Returns version metadata for the currently running Sapling backend application.',
  })
  @ApiResponse({
    status: 200,
    description: 'Version information for the running Sapling backend.',
    type: ApplicationVersionDto,
  })
  getVersion(): ApplicationVersionDto {
    return this.versionService.getVersion();
  }

  /**
   * Returns application state information.
   * @returns {ApplicationStateDto} Application state DTO
   */
  @Get('state')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get application state',
    description:
      'Returns lightweight runtime state information, such as whether the backend has finished bootstrapping and is ready to serve requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current readiness state of the Sapling backend.',
    type: ApplicationStateDto,
  })
  getState(): ApplicationStateDto {
    return { isReady: global.isReady || false };
  }
}
