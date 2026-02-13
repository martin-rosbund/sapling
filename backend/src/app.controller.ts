import { Body, Controller, Get, Post, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { SAPLING_FRONTEND_URL } from './constants/project.constants';
import { ApiResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiBody } from '@nestjs/swagger/dist/decorators/api-body.decorator';

/**
 * Main application controller.
 * Provides endpoints for application-level operations.
 */
@Controller('api')
export class AppController {
  /**
   * Injects the AppService for version and app-level logic.
   * @param {AppService} appService - The application service instance.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Redirects the root URL to the frontend application.
   * @returns A redirect response to the frontend URL.
   */
  @Get()
  @Redirect(SAPLING_FRONTEND_URL)
  getStart() {}

  /**
   * Echo endpoint for testing purposes.
   * @param {any} item - The item to echo back.
   * @returns {any} The same item that was passed in.
   */
  @Post('echo')
  @ApiBody({
    description: 'Item to echo back',
    required: true,
    schema: { type: 'object' },
  })
  @ApiResponse({
    status: 201,
    description: 'Successful request',
    schema: { example: {} },
  })
  postEcho(@Body() item: any): any {
    return this.appService.getEcho(item);
  }
}
