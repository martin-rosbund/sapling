import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ScriptService } from './script.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ScriptMethods } from './script.service';

/**
 * Controller for script API endpoints (runClient, runServer).
 */
@ApiTags('Script')
@Controller('api/script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  /**
   * Executes client-side script logic for an entity and user.
   * @param body Request body containing items, entity, user
   * @returns Result of client script execution
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
      },
      required: ['items', 'entity', 'user'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Client script result',
    schema: { type: 'object' },
  })
  async runClient(@Body() body: any): Promise<any> {
    const { items, entity, user } = body;
    if (!items || !entity || !user) {
      throw new BadRequestException('Missing required parameters');
    }
    return await this.scriptService.runClient(items, entity, user);
  }

  /**
   * Executes server-side script logic for an entity, user, and method.
   * @param body Request body containing method, items, entity, user
   * @returns Result of server script execution
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
  async runServer(@Body() body: any): Promise<any> {
    const { method, items, entity, user } = body;
    if (!method || !items || !entity || !user) {
      throw new BadRequestException('Missing required parameters');
    }
    // Convert method string to ScriptMethods enum value
    const methodEnum = ScriptMethods[method as keyof typeof ScriptMethods];
    if (typeof methodEnum !== 'number') {
      throw new BadRequestException('Invalid method');
    }
    return await this.scriptService.runServer(methodEnum, items, entity, user);
  }
}
