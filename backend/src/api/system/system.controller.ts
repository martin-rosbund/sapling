import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
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
@Controller('system')
export class SystemController {
  constructor(
    private readonly cpuService: CpuService,
    private readonly memoryService: MemoryService,
    private readonly filesystemService: FilesystemService,
    private readonly networkService: NetworkService,
    private readonly osService: OsService,
    private readonly timeService: TimeService,
    private readonly versionService: VersionService,
  ) {}

  @Get('cpu')
  @ApiOperation({ summary: 'CPU Informationen' })
  @ApiResponse({ status: 200, type: CpuDto })
  async getCpu(): Promise<CpuDto> {
    return await this.cpuService.getCpu();
  }

  @Get('cpu/speed')
  @ApiOperation({ summary: 'CPU Geschwindigkeit' })
  @ApiResponse({ status: 200, type: CpuSpeedDto })
  async getCpuSpeed(): Promise<CpuSpeedDto> {
    return await this.cpuService.getCpuSpeed();
  }

  @Get('memory')
  @ApiOperation({ summary: 'Arbeitsspeicher Informationen' })
  @ApiResponse({ status: 200, type: MemoryDto })
  async getMemory(): Promise<MemoryDto> {
    return await this.memoryService.getMemory();
  }

  @Get('filesystem')
  @ApiOperation({ summary: 'Dateisystem Informationen' })
  @ApiResponse({ status: 200, type: FilesystemDto, isArray: true })
  async getFilesystem(): Promise<FilesystemDto[]> {
    return await this.filesystemService.getFilesystem();
  }

  @Get('network')
  @ApiOperation({ summary: 'Netzwerk Informationen' })
  @ApiResponse({ status: 200, type: NetworkInterfaceDto, isArray: true })
  async getNetwork(): Promise<NetworkInterfaceDto[]> {
    return await this.networkService.getNetwork();
  }

  @Get('os')
  @ApiOperation({ summary: 'Betriebssystem Informationen' })
  @ApiResponse({ status: 200, type: OperatingSystemDto })
  async getOs(): Promise<OperatingSystemDto> {
    return await this.osService.getOs();
  }

  @Get('time')
  @ApiOperation({ summary: 'Zeit Informationen' })
  @ApiResponse({ status: 200, type: TimeDto })
  async getTime(): Promise<TimeDto> {
    return await this.timeService.getTime();
  }

  @Get('version')
  @ApiOperation({ summary: 'Version der Anwendung' })
  @ApiResponse({ status: 200, type: ApplicationVersionDto })
  getVersion(): ApplicationVersionDto {
    return { version: this.versionService.getVersion() };
  }
  @Get('state')
  @ApiOperation({ summary: 'Application State' })
  @ApiResponse({ status: 200, type: ApplicationStateDto })
  getState(): ApplicationStateDto {
    return { isReady: true };
  }
}
