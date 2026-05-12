import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  BadRequestException,
  Param,
  Query,
  Sse,
  MessageEvent,
  Header,
} from '@nestjs/common';
import { CurrentService } from './current.service';
import { CurrentMetadataService } from './current-metadata.service';
import { OpenTaskEventsService } from './open-task-events.service';
import { PersonItem } from '../../entity/PersonItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import type { Request } from 'express';
import { concatMap, from, map, Observable } from 'rxjs';
import {
  ApiBearerAuth,
  ApiParam,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import { InboxNotificationItem } from '../../entity/InboxNotificationItem';
import { AccumulatedPermissionDto } from './dto/accumulated-permission.dto';
import { WorkHourWeekItem } from '../../entity/WorkHourWeekItem';
import { UseGuards } from '@nestjs/common';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';

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
 * @method          getAllEntityPermissions(req: Request): AccumulatedPermissionDto[]
 *                  Get all entity permissions for the current user.
 * @method          getEntityPermission(req: Request, entityHandle: string): AccumulatedPermissionDto
 *                  Get entity permissions for the current user and a specific entity.
 * @method          getWorkWeek(req: Request): Promise<WorkHourWeekItem | null>
 *                  Get the work week configuration for the current user.
 */
@ApiTags('Current')
@ApiBearerAuth()
@Controller('api/current')
@UseGuards(SessionOrBearerAuthGuard)
export class CurrentController {
  /**
   * Service for current user logic
   * @type {CurrentService}
   */
  /**
   * Injects the CurrentService for user operations.
   * @param currentService Service for current user logic
   */
  constructor(
    private readonly currentService: CurrentService,
    private readonly currentMetadataService: CurrentMetadataService,
    private readonly openTaskEventsService: OpenTaskEventsService,
  ) {}

  /**
   * Get the current logged-in user profile.
   * @param req Express request object
   * @returns The current user as PersonItem
   */
  @Get('person')
  @ApiOperation({
    summary: 'Get the current user profile',
    description:
      'Returns the authenticated Sapling user profile, including persisted user details when available.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user profile.',
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
    description:
      'Changes the password of the authenticated user. Both password fields must be present and match exactly.',
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
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed because one or both password fields are missing, or the values do not match.',
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

  @Sse('openTaskCountEvents')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({
    summary: 'Subscribe to open task count updates',
    description:
      'Opens a server-sent event stream that emits the current open-task snapshot whenever the authenticated user\'s task count changes.',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description:
      'Server-sent event stream with open-task snapshot events for the authenticated user.',
  })
  streamOpenTaskCountEvents(@Req() req: Request): Observable<MessageEvent> {
    const user = req.user as PersonItem;
    return this.openTaskEventsService.streamForUser(user?.handle).pipe(
      concatMap(() => from(this.currentService.getOpenTaskSnapshot(user))),
      map(
        (snapshot): MessageEvent => ({
          type: 'open-task-snapshot',
          retry: 5000,
          data: snapshot,
        }),
      ),
    );
  }

  @Post('inboxNotification/:handle/read')
  @ApiOperation({
    summary: 'Mark inbox notification as read',
    description:
      'Marks one Sapling inbox notification as read for the authenticated user and returns the updated notification record.',
  })
  @ApiParam({
    name: 'handle',
    description: 'Numeric handle of the inbox notification to update.',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated inbox notification record.',
    type: InboxNotificationItem,
  })
  async markInboxNotificationRead(
    @Req() req: Request,
    @Param('handle') handle: string,
  ): Promise<InboxNotificationItem> {
    const user = req.user as PersonItem;
    return this.currentService.markInboxNotificationRead(Number(handle), user);
  }

  /**
   * Get all entity permissions for the current user.
   * @param req Express request object
   * @returns Permissions for all entities
   */
  @Get('permission')
  @ApiOperation({
    summary: 'Get all entity permissions',
    description:
      'Returns the resolved permission set for every entity available to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Resolved permissions for all entities available to the authenticated user.',
    type: [AccumulatedPermissionDto],
  })
  getAllEntityPermissions(@Req() req: Request): AccumulatedPermissionDto[] {
    const user = req.user as PersonItem;
    return this.currentService.getAllEntityPermissions(user);
  }

  /**
   * Get batched entity metadata for generic frontend workspaces.
   * @param req Express request object
   * @param entities Comma-separated list of entity handles
   * @returns Entity definitions, templates and current-user permissions
   * @throws BadRequestException if no entity handles are provided
   */
  @Get('meta')
  @ApiOperation({
    summary: 'Get entity metadata batch',
    description:
      'Returns entity definitions, template metadata, and current-user permissions for one or more entity handles in a single request.',
  })
  @ApiQuery({
    name: 'entities',
    required: true,
    description:
      'Comma-separated list of entity handles to resolve in one metadata request.',
    example: 'ticket,person,project',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description:
      'Metadata bundle containing entity definitions, templates, and permission snapshots for the requested entities.',
  })
  async getEntityMetadata(
    @Req() req: Request,
    @Query('entities') entities: string,
  ) {
    const entityHandles = (entities ?? '')
      .split(',')
      .map((entityHandle) => entityHandle.trim())
      .filter((entityHandle) => entityHandle.length > 0);

    if (entityHandles.length === 0) {
      throw new BadRequestException('exception.badRequest');
    }

    return this.currentMetadataService.getEntityMetadata(
      req.user as PersonItem,
      entityHandles,
    );
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
      'Returns the resolved permission set for the authenticated user on one specific entity.',
  })
  @ApiParam({
    name: 'entityHandle',
    description: 'Registered Sapling entity handle.',
    enum: ENTITY_HANDLES,
  })
  @ApiResponse({
    status: 200,
    description: 'Resolved permissions for the requested entity.',
    type: AccumulatedPermissionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'The entityHandle path parameter is missing or invalid.',
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
    summary: 'Get the current work week configuration',
    description:
      'Returns the work week configuration that is currently assigned to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Work week configuration for the authenticated user.',
    type: WorkHourWeekItem,
  })
  getWorkWeek(@Req() req: Request): Promise<WorkHourWeekItem | null> {
    const user = req.user as PersonItem;
    return this.currentService.getWorkWeek(user);
  }
}
