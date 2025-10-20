import { Controller, Param, Post } from '@nestjs/common';
import { KpiService } from './kpi.service';

@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  /**
   * Führt eine KPI anhand ihrer ID aus und gibt das Ergebnis zurück
   */
  @Post('execute/:handle')
  async executeKPI(@Param('handle') handle: number) {
    return this.kpiService.executeKPIById(Number(handle));
  }
}
