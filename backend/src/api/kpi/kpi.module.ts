import { Module } from '@nestjs/common';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

/**
 * @class KpiModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module providing KPI-related services and controller for KPI API endpoints.
 *
 * @property        {KpiService}     KpiService     Service for KPI logic
 * @property        {KpiController}  KpiController  Controller for KPI endpoints
 */
@Module({
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
