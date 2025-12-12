import { Controller, Get, Param } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { KpiResponseDto } from './dto/kpi-response.dto';
import { KpiValueDto } from './dto/kpi-value.dto';

/**
 * Controller for KPI execution endpoints
 */
@ApiTags('KPI')
@Controller('api/kpi')
export class KpiController {
  /**
   * Injects the KpiService for KPI operations.
   * @param kpiService Service for KPI logic
   */
  constructor(private readonly kpiService: KpiService) {}

  /**
   * Execute a KPI by its ID and return the result.
   * @param handle The KPI handle (ID)
   * @returns The result of the KPI execution
   */
  @Get('execute/:handle')
  @ApiOperation({
    summary: 'Execute KPI by ID',
    description: 'Executes a KPI by its ID and returns the result.',
  })
  @ApiParam({
    name: 'handle',
    type: Number,
    description: 'The KPI handle (ID)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Result of the KPI execution. Contains the KPI metadata and the computed value/result.',
    type: KpiResponseDto,
  })
  async executeKPI(@Param('handle') handle: number): Promise<KpiValueDto> {
    return this.kpiService.executeKPIById(Number(handle));
  }
}
