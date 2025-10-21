import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Main application controller.
 * Provides endpoints for application-level operations.
 */
@Controller()
export class AppController {
  /**
   * Injects the AppService for version and app-level logic.
   * @param {AppService} appService - The application service instance.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Returns the current application version.
   * @returns {string} The version string from package.json.
   */
  @Get()
  getVersion(): string {
    return this.appService.getVersion();
  }
}
