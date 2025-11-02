import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { CurrentService } from './current.service';
import { PersonItem } from 'src/entity/PersonItem';
import { ENTITY_NAMES } from '../../entity/global/entity.registry';
import type { Request } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

/**
 * Controller for endpoints related to the current user (profile, password, permissions, tasks, etc.)
 */
@ApiTags('Current')
@Controller('current')
export class CurrentController {
  /**
   * Injects the CurrentService for user operations.
   * @param currentService Service for current user logic
   */
  constructor(private readonly currentService: CurrentService) {}

  /**
   * Get the current logged-in user profile.
   * @param req Express request object
   * @returns The current user as PersonItem
   */
  @Get('person')
  @ApiOperation({ summary: 'Get current user profile', description: 'Returns the current logged-in user (PersonItem) from the request.' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: PersonItem })
  getPerson(@Req() req: Request): PersonItem {
    return req.user as PersonItem;
  }

  /**
   * Change the password for the current user.
   * @param req Express request object
   * @param newPassword The new password
   * @param confirmPassword The confirmation of the new password
   * @returns void
   * @throws BadRequestException if passwords are missing or do not match
   */
  @Post('changePassword')
  @ApiOperation({ summary: 'Change current user password', description: 'Changes the password for the current user.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: { type: 'string', description: 'The new password' },
        confirmPassword: { type: 'string', description: 'Confirmation of the new password' },
      },
      required: ['newPassword', 'confirmPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request: passwords missing or do not match' })
  async changePassword(
    @Req() req: Request,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ): Promise<void> {
    if (!newPassword || !confirmPassword) {
      throw new BadRequestException('login.passwordRequired');
    }
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('login.passwordsDoNotMatch');
    }
    const user = req.user as PersonItem;
    await this.currentService.changePassword(user, newPassword);
  }

  /**
   * Get all open tickets assigned to the current user.
   * @param req Express request object
   * @returns Array of open tickets
   */
  @Get('openTickets')
  @ApiOperation({ summary: 'Get open tickets', description: 'Returns all open tickets assigned to the current user.' })
  @ApiResponse({ status: 200, description: 'List of open tickets', type: [Object] })
  async getOpenTickets(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getOpenTickets(user);
  }

  /**
   * Get all open events assigned to the current user.
   * @param req Express request object
   * @returns Array of open events
   */
  @Get('openEvents')
  @ApiOperation({ summary: 'Get open events', description: 'Returns all open events assigned to the current user.' })
  @ApiResponse({ status: 200, description: 'List of open events', type: [Object] })
  async getOpenEvents(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getOpenEvents(user);
  }

  /**
   * Get the count of open tasks for the current user.
   * @param req Express request object
   * @returns Number of open tasks
   */
  @Get('countOpenTasks')
  @ApiOperation({ summary: 'Count open tasks', description: 'Returns the count of open tasks for the current user.' })
  @ApiResponse({ status: 200, description: 'Number of open tasks', type: Number })
  async countOpenTasks(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.countOpenTasks(user);
  }

  /**
   * Get all entity permissions for the current user.
   * @param req Express request object
   * @returns Permissions for all entities
   */
  @Get('permission')
  @ApiOperation({ summary: 'Get all entity permissions', description: 'Returns all entity permissions for the current user.' })
  @ApiResponse({ status: 200, description: 'Permissions for all entities', type: Object })
  getAllEntityPermissions(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getAllEntityPermissions(user);
  }

  /**
   * Get entity permissions for the current user and a specific entity.
   * @param req Express request object
   * @param entityName Name of the entity
   * @returns Permissions for the specified entity
   * @throws BadRequestException if entityName is missing
   */
  @Get('permission/:entityName')
  @ApiOperation({ summary: 'Get entity permissions', description: 'Returns entity permissions for the current user and a specific entity.' })
  @ApiParam({
    name: 'entityName',
    description: 'Name of the entity',
    enum: ENTITY_NAMES,
  })
  @ApiResponse({ status: 200, description: 'Permissions for the specified entity', type: Object })
  @ApiResponse({ status: 400, description: 'Bad request: entityName is required' })
  getEntityPermission(
    @Req() req: Request,
    @Param('entityName') entityName: string,
  ) {
    const user = req.user as PersonItem;
    if (!entityName) {
      throw new BadRequestException('entityName is required');
    }
    return this.currentService.getEntityPermissions(user, entityName);
  }

  /**
   * Get the work week configuration for the current user.
   * @param req Express request object
   * @returns Work week configuration
   */
  @Get('workWeek')
  @ApiOperation({ summary: 'Get work week', description: 'Returns the work week configuration for the current user.' })
  @ApiResponse({ status: 200, description: 'Work week configuration', type: Object })
  getWorkWeek(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getWorkWeek(user);
  }
}
