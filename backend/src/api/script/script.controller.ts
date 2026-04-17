import {
  Body,
  BadRequestException,
  Controller,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ScriptService } from './script.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ScriptMethods } from './script.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import type { Request } from 'express';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';
import {
  GENERIC_PERMISSION_RESOLVE_KEY,
  GenericPermission,
  type GenericPermissionAction,
} from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../generic/generic-permission.guard';

const SCRIPT_METHOD_PERMISSION_MAP: Record<
  keyof typeof ScriptMethods,
  GenericPermissionAction
> = {
  beforeRead: 'allowRead',
  afterRead: 'allowRead',
  beforeUpdate: 'allowUpdate',
  afterUpdate: 'allowUpdate',
  beforeInsert: 'allowInsert',
  afterInsert: 'allowInsert',
  beforeDelete: 'allowDelete',
  afterDelete: 'allowDelete',
};

type ScriptPermissionBody = {
  entity?: {
    handle?: string | number;
  };
  entityHandle?: string | number;
  method?: keyof typeof ScriptMethods;
};

const resolveScriptReadPermission = (
  req: Request<Record<string, string>, unknown, ScriptPermissionBody>,
) => {
  const body = req.body;

  return {
    entityHandle:
      body?.entity?.handle !== undefined
        ? String(body.entity.handle)
        : body?.entityHandle !== undefined
          ? String(body.entityHandle)
          : undefined,
  };
};

const resolveScriptServerPermission = (
  req: Request<Record<string, string>, unknown, ScriptPermissionBody>,
) => {
  const body = req.body;

  return {
    entityHandle:
      body?.entity?.handle !== undefined
        ? String(body.entity.handle)
        : body?.entityHandle !== undefined
          ? String(body.entityHandle)
          : undefined,
    permission:
      body?.method !== undefined
        ? (SCRIPT_METHOD_PERMISSION_MAP[body.method] ?? 'allowRead')
        : 'allowRead',
  };
};

type ScriptExecutionBody = {
  items: object | object[];
  entity: EntityItem;
  name: string;
  parameter?: unknown;
};

type ScriptServerExecutionBody = ScriptExecutionBody & {
  method: keyof typeof ScriptMethods;
};

/**
 * @class ScriptController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller providing API endpoints for running client and server script logic.
 *
 * @property        {ScriptService} scriptService Service for script execution logic
 */
@ApiTags('Script')
@ApiBearerAuth()
@Controller('api/script')
@UseGuards(SessionOrBearerAuthGuard)
export class ScriptController {
  /**
   * Creates an instance of ScriptController.
   * @param {ScriptService} scriptService Service for script execution logic
   */
  constructor(private readonly scriptService: ScriptService) {}

  /**
   * Executes client-side script logic for an entity and user.
   * @param {object} body Request body containing items, entity, user
   * @returns {Promise<any>} Result of client script execution
   */
  @Post('runClient')
  @ApiOperation({
    summary: 'Run client-side script',
    description:
      'Executes client-side script logic for the given entity and user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'object',
          description: 'Selected data records (object or array)',
        },
        entity: {
          type: 'object',
          description: 'Entity for which the script is executed',
        },
        name: {
          type: 'string',
          description: 'Name of the client-side script action',
        },
        parameter: {
          nullable: true,
          description: 'Optional parameter payload for the script action',
        },
      },
      required: ['items', 'entity', 'name'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Client script result',
    schema: { type: 'object' },
  })
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowRead')
  @SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolveScriptReadPermission)
  async runClient(
    @Req() req: Request & { user: PersonItem },
    @Body() body: ScriptExecutionBody,
  ): Promise<unknown> {
    const { items, entity, name, parameter } = body;
    if (!items || !entity || !name) {
      throw new BadRequestException('script.scriptMissingParameters');
    }
    return this.scriptService.runClient(
      items,
      entity,
      req.user,
      name,
      parameter,
    );
  }

  /**
   * Executes server-side script logic for an entity, user, and method.
   * @param {object} body Request body containing method, items, entity, user
   * @returns {Promise<any>} Result of server script execution
   */
  @Post('runServer')
  @ApiOperation({
    summary: 'Run server-side script',
    description:
      'Executes server-side script logic for the given method, entity, and user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: Object.keys(ScriptMethods),
          description: 'Script lifecycle method',
        },
        items: {
          type: 'object',
          description: 'Selected data records (object or array)',
        },
        entity: {
          type: 'object',
          description: 'Entity for which the script is executed',
        },
      },
      required: ['method', 'items', 'entity'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Server script result',
    schema: { type: 'object' },
  })
  @UseGuards(GenericPermissionGuard)
  @SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolveScriptServerPermission)
  async runServer(
    @Req() req: Request & { user: PersonItem },
    @Body() body: ScriptServerExecutionBody,
  ): Promise<unknown> {
    const { method, items, entity } = body;
    if (!method || !items || !entity) {
      throw new BadRequestException('script.scriptMissingParameters');
    }
    // Convert method string to ScriptMethods enum value
    const methodEnum = ScriptMethods[method];
    if (typeof methodEnum !== 'number') {
      throw new BadRequestException('script.invalidMethod');
    }
    return await this.scriptService.runServer(
      methodEnum,
      items,
      entity,
      req.user,
    );
  }
}
