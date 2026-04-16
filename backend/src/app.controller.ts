import { Body, Controller, Get, Post, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { SAPLING_FRONTEND_URL } from './constants/project.constants';
import { ApiResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { ApiBody } from '@nestjs/swagger/dist/decorators/api-body.decorator';

/**
 * @class AppController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Main application controller. Provides endpoints for application-level operations.
 *
 * @property        {AppService} appService      Injected application service instance
 *
 * @method          getStart()                   Redirects root URL to frontend application
 * @method          postEcho(item: any): any     Echo endpoint for testing purposes
 */

/**
 * Main application controller.
 * Provides endpoints for application-level operations.
 */
@Controller('api')
export class AppController {
  // #region Properties: Dependency Injection
  /**
   * Injected application service instance.
   * @type {AppService}
   */
  private readonly appService: AppService;
  // #endregion

  // #region Constructor
  /**
   * Constructs the AppController and injects AppService.
   * @param {AppService} appService - The application service instance.
   */
  constructor(appService: AppService) {
    this.appService = appService;
  }
  // #endregion

  // #region Endpoints
  /**
   * Redirects the root API URL to the frontend application.
   * @decorator {Get}
   * @decorator {Redirect}
   * @returns {void} Redirect response to frontend URL.
   */
  @Get()
  @Redirect(SAPLING_FRONTEND_URL)
  getStart(): void {}

  /**
   * Echo endpoint for testing purposes.
   * Receives an item and returns it unchanged.
   * @decorator {Post('echo')}
   * @decorator {ApiBody}
   * @decorator {ApiResponse}
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
  // #endregion
}
