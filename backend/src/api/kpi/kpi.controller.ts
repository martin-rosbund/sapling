import { Controller, Param, Post } from '@nestjs/common';
import { KpiService } from './kpi.service';

// Controller for KPI execution endpoints

@Controller('kpi')
export class KpiController {
  /**
   * Injects the KpiService for KPI operations.
   * @param kpiService - Service for KPI logic
   */
  constructor(private readonly kpiService: KpiService) {}

  /**
   * Executes a KPI by its ID and returns the result.
   * @param handle - The KPI handle (ID)
   * @returns The result of the KPI execution
   */
  @Post('execute/:handle')
  async executeKPI(@Param('handle') handle: number) {
    return this.kpiService.executeKPIById(Number(handle));
  }
}
