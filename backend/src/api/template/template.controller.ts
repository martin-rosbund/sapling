import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { EntityTemplateDto } from './dto/entity-template.dto';
import {
  ApiGenericEntityOperation,
  GenericPermission,
} from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../../auth/guard/generic-permission.guard';
import { TemplateService } from './template.service';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for handling entity template metadata endpoints.
 *
 * @property        templateService      Service for template operations
 * @method          getEntityTemplate    Get the properties (columns) of an entity as metadata
 */
@ApiTags('Template')
@ApiBearerAuth()
@Controller('api/template')
@UseGuards(SessionOrBearerAuthGuard)
export class TemplateController {
  /**
   * Injects the TemplateService for retrieving entity templates.
   * @param templateService Service for template operations
   */
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Get the properties (columns) of an entity as metadata.
   * @param entityHandle The name of the entity
   * @returns Array of entity property metadata
   * @route GET /api/template/:entityHandle
   * @access Protected
   */
  @Get(':entityHandle')
  @ApiOperation({
    summary: 'Get entity template metadata',
    description: 'Returns the properties (columns) of an entity as metadata.',
  })
  @ApiParam({
    name: 'entityHandle',
    type: String,
    description: 'The name of the entity',
  })
  @ApiGenericEntityOperation('Returns the properties (columns) of an entity')
  @ApiResponse({
    status: 200,
    description:
      'Array of entity property metadata objects. Each object describes a property (column) of the entity.',
    type: EntityTemplateDto,
    isArray: true,
  })
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowRead')
  getEntityTemplate(
    @Param('entityHandle') entityHandle: string,
  ): EntityTemplateDto[] {
    return this.templateService.getEntityTemplate(entityHandle);
  }
}
