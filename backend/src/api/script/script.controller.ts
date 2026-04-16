import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ScriptService } from './script.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ScriptMethods } from './script.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';

type ScriptExecutionBody = {
  items: object | object[];
  entity: EntityItem;
  user: PersonItem;
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
@Controller('api/script')
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
        user: { type: 'object', description: 'User executing the script' },
        name: {
          type: 'string',
          description: 'Name of the client-side script action',
        },
        parameter: {
          nullable: true,
          description: 'Optional parameter payload for the script action',
        },
      },
      required: ['items', 'entity', 'user', 'name'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Client script result',
    schema: { type: 'object' },
  })
  async runClient(@Body() body: ScriptExecutionBody): Promise<unknown> {
    const { items, entity, user, name, parameter } = body;
    if (!items || !entity || !user || !name) {
      throw new BadRequestException('script.scriptMissingParameters');
    }
    return this.scriptService.runClient(items, entity, user, name, parameter);
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
        user: { type: 'object', description: 'User executing the script' },
      },
      required: ['method', 'items', 'entity', 'user'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Server script result',
    schema: { type: 'object' },
  })
  async runServer(@Body() body: ScriptServerExecutionBody): Promise<unknown> {
    const { method, items, entity, user } = body;
    if (!method || !items || !entity || !user) {
      throw new BadRequestException('script.scriptMissingParameters');
    }
    // Convert method string to ScriptMethods enum value
    const methodEnum = ScriptMethods[method];
    if (typeof methodEnum !== 'number') {
      throw new BadRequestException('script.invalidMethod');
    }
    return await this.scriptService.runServer(methodEnum, items, entity, user);
  }
}
