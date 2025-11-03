import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { EntityTemplateDto } from './dto/entity-template.dto';
import { ApiGenericEntityOperation } from '../generic/generic.decorator';
import { TemplateService } from './template.service';

/**
 * Controller for handling entity template metadata endpoints
 */
@ApiTags('Template')
@Controller('template')
export class TemplateController {
  /**
   * Injects the TemplateService for retrieving entity templates.
   * @param templateService Service for template operations
   */
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Get the properties (columns) of an entity as metadata.
   * @param entityName The name of the entity
   * @returns Array of entity property metadata
   */
  @Get(':entityName')
  @ApiOperation({
    summary: 'Get entity template metadata',
    description: 'Returns the properties (columns) of an entity as metadata.',
  })
  @ApiParam({
    name: 'entityName',
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
  getEntityTemplate(
    @Param('entityName') entityName: string,
  ): EntityTemplateDto[] {
    return this.templateService.getEntityTemplate(entityName);
  }
}
