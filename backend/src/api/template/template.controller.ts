import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiGenericEntityOperation } from '../generic/generic.decorator';
import { TemplateService } from './template.service';

// Controller for handling entity template metadata endpoints

@Controller('template')
export class TemplateController {
  /**
   * Injects the TemplateService for retrieving entity templates.
   * @param templateService - Service for template operations
   */
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Returns the properties (columns) of an entity as metadata.
   * @param entityName - The name of the entity
   * @returns Array of entity property metadata
   */
  @Get(':entityName')
  @ApiGenericEntityOperation('Returns the properties (columns) of an entity')
  @ApiResponse({
    status: 200,
    description: 'Entity metadata',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          length: { type: 'number', nullable: true },
          nullable: { type: 'boolean' },
          default: { type: 'any', nullable: true },
          isPrimaryKey: { type: 'boolean' },
        },
      },
    },
  })
  getEntityTemplate(@Param('entityName') entityName: string) {
    return this.templateService.getEntityTemplate(entityName);
  }
}
