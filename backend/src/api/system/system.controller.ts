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
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';

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
@UseGuards(SessionOrBearerAuthGuard)
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
  @ApiOperation({ summary: 'CPU information' })
  @ApiResponse({ status: 200, type: CpuDto })
  async getCpu(): Promise<CpuDto> {
    return await this.cpuService.getCpu();
  }

  /**
   * Returns CPU speed information.
   * @returns {Promise<CpuSpeedDto>} CPU speed DTO
   */
  @Get('cpu/speed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'CPU speed' })
  @ApiResponse({ status: 200, type: CpuSpeedDto })
  async getCpuSpeed(): Promise<CpuSpeedDto> {
    return await this.cpuService.getCpuSpeed();
  }

  /**
   * Returns memory information.
   * @returns {Promise<MemoryDto>} Memory information DTO
   */
  @Get('memory')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Memory information' })
  @ApiResponse({ status: 200, type: MemoryDto })
  async getMemory(): Promise<MemoryDto> {
    return await this.memoryService.getMemory();
  }

  /**
   * Returns filesystem information.
   * @returns {Promise<FilesystemDto[]>} Array of filesystem DTOs
   */
  @Get('filesystem')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Filesystem information' })
  @ApiResponse({ status: 200, type: FilesystemDto, isArray: true })
  async getFilesystem(): Promise<FilesystemDto[]> {
    return await this.filesystemService.getFilesystem();
  }

  /**
   * Returns network information.
   * @returns {Promise<NetworkInterfaceDto[]>} Array of network interface DTOs
   */
  @Get('network')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Network information' })
  @ApiResponse({ status: 200, type: NetworkInterfaceDto, isArray: true })
  async getNetwork(): Promise<NetworkInterfaceDto[]> {
    return await this.networkService.getNetwork();
  }

  /**
   * Returns operating system information.
   * @returns {Promise<OperatingSystemDto>} Operating system DTO
   */
  @Get('os')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Operating system information' })
  @ApiResponse({ status: 200, type: OperatingSystemDto })
  async getOs(): Promise<OperatingSystemDto> {
    return await this.osService.getOs();
  }

  /**
   * Returns time information.
   * @returns {Promise<TimeDto>} Time DTO
   */
  @Get('time')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Time information' })
  @ApiResponse({ status: 200, type: TimeDto })
  getTime(): TimeDto {
    return this.timeService.getTime();
  }

  /**
   * Returns application version information.
   * @returns {ApplicationVersionDto} Application version DTO
   */
  @Get('version')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Application version' })
  @ApiResponse({ status: 200, type: ApplicationVersionDto })
  getVersion(): ApplicationVersionDto {
    return this.versionService.getVersion();
  }

  /**
   * Returns application state information.
   * @returns {ApplicationStateDto} Application state DTO
   */
  @Get('state')
  @ApiOperation({ summary: 'Application state' })
  @ApiResponse({ status: 200, type: ApplicationStateDto })
  getState(): ApplicationStateDto {
    return { isReady: global.isReady || false };
  }
}
