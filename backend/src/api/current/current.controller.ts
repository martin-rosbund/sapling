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
import { PersonItem } from '../../entity/PersonItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import type { Request } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TicketItem } from '../../entity/TicketItem';
import { EventItem } from '../../entity/EventItem';
import { AccumulatedPermissionDto } from './dto/accumulated-permission.dto';
import { WorkHourWeekItem } from '../../entity/WorkHourWeekItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for endpoints related to the current user (profile, password, permissions, tasks, etc.)
 *
 * @property        {CurrentService} currentService   Service for current user logic
 *
 * @method          getPerson(req: Request): PersonItem
 *                  Get the current logged-in user profile.
 * @method          changePassword(req: Request, newPassword: string, confirmPassword: string): Promise<void>
 *                  Change the password for the current user.
 * @method          getOpenTickets(req: Request): Promise<TicketItem[]>
 *                  Get all open tickets assigned to the current user.
 * @method          getOpenEvents(req: Request): Promise<EventItem[]>
 *                  Get all open events assigned to the current user.
 * @method          countOpenTasks(req: Request): Promise<{ count: number }>
 *                  Get the count of open tasks for the current user.
 * @method          getAllEntityPermissions(req: Request): AccumulatedPermissionDto[]
 *                  Get all entity permissions for the current user.
 * @method          getEntityPermission(req: Request, entityHandle: string): AccumulatedPermissionDto
 *                  Get entity permissions for the current user and a specific entity.
 * @method          getWorkWeek(req: Request): Promise<WorkHourWeekItem | null>
 *                  Get the work week configuration for the current user.
 */
@ApiTags('Current')
@Controller('api/current')
export class CurrentController {
  /**
   * Service for current user logic
   * @type {CurrentService}
   */
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
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the current logged-in user (PersonItem) from the request.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: PersonItem,
  })
  async getPerson(@Req() req: Request): Promise<PersonItem> {
    const user = req.user as PersonItem;
    return (await this.currentService.getPerson(user)) ?? user;
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
  @ApiOperation({
    summary: 'Change current user password',
    description: 'Changes the password for the current user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: { type: 'string', description: 'The new password' },
        confirmPassword: {
          type: 'string',
          description: 'Confirmation of the new password',
        },
      },
      required: ['newPassword', 'confirmPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request: passwords missing or do not match',
  })
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
  @ApiOperation({
    summary: 'Get open tickets',
    description: 'Returns all open tickets assigned to the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of open tickets',
    type: [TicketItem],
  })
  async getOpenTickets(@Req() req: Request): Promise<TicketItem[]> {
    const user = req.user as PersonItem;
    return this.currentService.getOpenTickets(user);
  }

  /**
   * Get all open events assigned to the current user.
   * @param req Express request object
   * @returns Array of open events
   */
  @Get('openEvents')
  @ApiOperation({
    summary: 'Get open events',
    description: 'Returns all open events assigned to the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of open events',
    type: [EventItem],
  })
  async getOpenEvents(@Req() req: Request): Promise<EventItem[]> {
    const user = req.user as PersonItem;
    return this.currentService.getOpenEvents(user);
  }

  /**
   * Get the count of open tasks for the current user.
   * @param req Express request object
   * @returns Number of open tasks
   */
  @Get('countOpenTasks')
  @ApiOperation({
    summary: 'Count open tasks',
    description: 'Returns the count of open tasks for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of open tasks',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of open tasks' },
      },
    },
  })
  async countOpenTasks(@Req() req: Request): Promise<{ count: number }> {
    const user = req.user as PersonItem;
    return this.currentService.countOpenTasks(user);
  }

  /**
   * Get all entity permissions for the current user.
   * @param req Express request object
   * @returns Permissions for all entities
   */
  @Get('permission')
  @ApiOperation({
    summary: 'Get all entity permissions',
    description: 'Returns all entity permissions for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions for all entities',
    type: [AccumulatedPermissionDto],
  })
  getAllEntityPermissions(@Req() req: Request): AccumulatedPermissionDto[] {
    const user = req.user as PersonItem;
    return this.currentService.getAllEntityPermissions(user);
  }

  /**
   * Get entity permissions for the current user and a specific entity.
   * @param req Express request object
   * @param entityHandle Name of the entity
   * @returns Permissions for the specified entity
   * @throws BadRequestException if entityHandle is missing
   */
  @Get('permission/:entityHandle')
  @ApiOperation({
    summary: 'Get entity permissions',
    description:
      'Returns entity permissions for the current user and a specific entity.',
  })
  @ApiParam({
    name: 'entityHandle',
    description: 'Name of the entity',
    enum: ENTITY_HANDLES,
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions for the specified entity',
    type: AccumulatedPermissionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request: entityHandle is required',
  })
  getEntityPermission(
    @Req() req: Request,
    @Param('entityHandle') entityHandle: string,
  ): AccumulatedPermissionDto {
    const user = req.user as PersonItem;
    if (!entityHandle) {
      throw new BadRequestException('global.entityHandleRequired');
    }
    return this.currentService.getEntityPermissions(user, entityHandle);
  }

  /**
   * Get the work week configuration for the current user.
   * @param req Express request object
   * @returns Work week configuration
   */
  @Get('workWeek')
  @ApiOperation({
    summary: 'Get work week',
    description: 'Returns the work week configuration for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Work week configuration',
    type: WorkHourWeekItem,
  })
  getWorkWeek(@Req() req: Request): Promise<WorkHourWeekItem | null> {
    const user = req.user as PersonItem;
    return this.currentService.getWorkWeek(user);
  }
}
