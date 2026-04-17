import {
  Controller,
  Get,
  NotFoundException,
  Param,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { KpiService } from './kpi.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { KpiResponseDto } from './dto/kpi-response.dto';
import type { Request } from 'express';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';
import {
  GENERIC_PERMISSION_RESOLVE_KEY,
  GenericPermission,
} from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../generic/generic-permission.guard';
import { KpiItem } from '../../entity/KpiItem';

const resolveKpiEntityPermission = async (
  req: Request<{ handle?: string }>,
  em: EntityManager,
) => {
  const kpi = await em.findOne(
    KpiItem,
    { handle: Number(req.params.handle) },
    { populate: ['targetEntity'] },
  );

  if (!kpi?.targetEntity) {
    throw new NotFoundException('global.notFound');
  }

  return {
    entityHandle:
      typeof kpi.targetEntity === 'object'
        ? kpi.targetEntity.handle
        : undefined,
  };
};

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
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowRead')
  @SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolveKpiEntityPermission)
  async executeKPI(@Param('handle') handle: number): Promise<KpiResponseDto> {
    return this.kpiService.executeKPIById(Number(handle));
  }
}
