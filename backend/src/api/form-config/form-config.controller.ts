import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import { PersonItem } from '../../entity/PersonItem';
import { TemplateService } from '../template/template.service';
import { CurrentService } from '../current/current.service';
import { FormConfigService } from './form-config.service';
import {
  EffectiveSaplingFormTemplateDto,
  SaplingFormConfigValidationResultDto,
  SaveSaplingFormConfigDto,
} from './dto/form-config.dto';
import { SaplingFormConfigItem } from '../../entity/SaplingFormConfigItem';
import { ROLE_HANDLE } from '../../database/seeder/role-handles';

type FormConfigPermissionAction = 'insert' | 'update';

@ApiTags('Form Config')
@ApiBearerAuth()
@Controller('api/form-config')
@UseGuards(SessionOrBearerAuthGuard)
export class FormConfigController {
  constructor(
    private readonly formConfigService: FormConfigService,
    private readonly templateService: TemplateService,
    private readonly currentService: CurrentService,
  ) {}

  @Get(':entityHandle/effective-template')
  @ApiOperation({
    summary: 'Get effective form template',
    description:
      'Returns entity template metadata after applying global, role, and person form configuration overlays.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiResponse({
    status: 200,
    description: 'Effective template metadata for one entity.',
    type: EffectiveSaplingFormTemplateDto,
  })
  async getEffectiveTemplate(
    @Req() req: Request,
    @Param('entityHandle') entityHandle: string,
  ): Promise<EffectiveSaplingFormTemplateDto> {
    const baseTemplates = this.templateService.getEntityTemplate(entityHandle);
    const entityTemplates = await this.formConfigService.getEffectiveTemplate(
      entityHandle,
      baseTemplates,
      req.user as PersonItem,
    );

    return {
      entityHandle,
      entityTemplates,
    };
  }

  @Get(':entityHandle')
  @ApiOperation({
    summary: 'List form configurations',
    description: 'Returns saved form configuration overlays for one entity.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiResponse({
    status: 200,
    description: 'Saved form configurations.',
    type: SaplingFormConfigItem,
    isArray: true,
  })
  async listConfigs(
    @Param('entityHandle') entityHandle: string,
  ): Promise<SaplingFormConfigItem[]> {
    return this.formConfigService.listConfigs(entityHandle);
  }

  @Get(':entityHandle/:handle/export')
  @ApiOperation({
    summary: 'Export a form configuration',
    description:
      'Returns the normalized JSON payload for one saved form configuration.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiParam({ name: 'handle', type: Number })
  async exportConfig(
    @Param('entityHandle') entityHandle: string,
    @Param('handle') handle: string,
  ) {
    const config = await this.formConfigService.getConfig(
      entityHandle,
      Number(handle),
    );
    return config.config;
  }

  @Post(':entityHandle/validate')
  @ApiOperation({
    summary: 'Validate form configuration JSON',
    description:
      'Validates and normalizes an importable form configuration without saving it.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  @ApiResponse({
    status: 200,
    description: 'Validation result.',
    type: SaplingFormConfigValidationResultDto,
  })
  validateConfig(
    @Param('entityHandle') entityHandle: string,
    @Body() config: unknown,
  ): SaplingFormConfigValidationResultDto {
    const templates = this.templateService.getEntityTemplate(entityHandle);
    return this.formConfigService.validateConfig(
      entityHandle,
      config,
      templates,
    );
  }

  @Post(':entityHandle/import')
  @ApiOperation({
    summary: 'Import a form configuration',
    description:
      'Validates and saves a form configuration JSON payload as a new configuration.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiResponse({
    status: 201,
    description: 'Saved imported form configuration.',
    type: SaplingFormConfigItem,
  })
  async importConfig(
    @Req() req: Request,
    @Param('entityHandle') entityHandle: string,
    @Body() payload: SaveSaplingFormConfigDto,
  ): Promise<SaplingFormConfigItem> {
    return this.saveConfigForRequest(req, entityHandle, payload, 'insert');
  }

  @Post(':entityHandle')
  @ApiOperation({
    summary: 'Create a form configuration',
    description: 'Creates a saved form configuration overlay for one entity.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiResponse({
    status: 201,
    description: 'Created form configuration.',
    type: SaplingFormConfigItem,
  })
  async createConfig(
    @Req() req: Request,
    @Param('entityHandle') entityHandle: string,
    @Body() payload: SaveSaplingFormConfigDto,
  ): Promise<SaplingFormConfigItem> {
    return this.saveConfigForRequest(req, entityHandle, payload, 'insert');
  }

  @Patch(':entityHandle/:handle')
  @ApiOperation({
    summary: 'Update a form configuration',
    description: 'Updates a saved form configuration overlay.',
  })
  @ApiParam({ name: 'entityHandle', type: String })
  @ApiParam({ name: 'handle', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Updated form configuration.',
    type: SaplingFormConfigItem,
  })
  async updateConfig(
    @Req() req: Request,
    @Param('entityHandle') entityHandle: string,
    @Param('handle') handle: string,
    @Body() payload: SaveSaplingFormConfigDto,
  ): Promise<SaplingFormConfigItem> {
    return this.saveConfigForRequest(
      req,
      entityHandle,
      payload,
      'update',
      Number(handle),
    );
  }

  private saveConfigForRequest(
    req: Request,
    entityHandle: string,
    payload: SaveSaplingFormConfigDto,
    action: FormConfigPermissionAction,
    existingHandle?: number,
  ): Promise<SaplingFormConfigItem> {
    this.assertCanManageFormConfigs(req.user as PersonItem, action);
    const templates = this.templateService.getEntityTemplate(entityHandle);
    return this.formConfigService.saveConfig(
      entityHandle,
      payload,
      templates,
      existingHandle,
    );
  }

  private assertCanManageFormConfigs(
    user: PersonItem,
    action: FormConfigPermissionAction,
  ): void {
    const permission = this.currentService.getEntityPermissions(
      user,
      'saplingFormConfig',
    );
    const isAllowed =
      action === 'insert' ? permission.allowInsert : permission.allowUpdate;

    if (!isAllowed && !this.hasAdministratorRole(user)) {
      throw new ForbiddenException('exception.forbidden');
    }
  }

  private hasAdministratorRole(user: PersonItem): boolean {
    const roles = user.roles;
    if (!roles) {
      return false;
    }

    const roleItems = roles.getItems();

    return roleItems.some(
      (role) =>
        role?.isAdministrator === true || role?.handle === ROLE_HANDLE.ADMIN,
    );
  }
}
