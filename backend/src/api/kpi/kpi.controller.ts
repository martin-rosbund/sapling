import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { KpiService } from './kpi.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { KpiResponseDto } from './dto/kpi-response.dto';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';

/**
 * @class KpiController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller providing API endpoints for KPI execution.
 *
 * @property        {KpiService} kpiService Service for KPI logic
 */
@ApiTags('KPI')
@ApiBearerAuth()
@Controller('api/kpi')
@UseGuards(SessionOrBearerAuthGuard)
export class KpiController {
  /**
   * Creates an instance of KpiController.
   * @param {KpiService} kpiService Service for KPI logic
   */
  constructor(private readonly kpiService: KpiService) {}

  /**
   * Executes a KPI by its ID and returns the result.
   * @param {number} handle The KPI handle (ID)
   * @returns {Promise<KpiValueDto>} The result of the KPI execution
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
  async executeKPI(@Param('handle') handle: number): Promise<KpiResponseDto> {
    return this.kpiService.executeKPIById(Number(handle));
  }
}
