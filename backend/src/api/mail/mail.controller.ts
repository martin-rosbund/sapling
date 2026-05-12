import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PersonItem } from '../../entity/PersonItem';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import { MailService } from './mail.service';
import {
  MailPreviewDto,
  MailPreviewResponseDto,
  MailSenderListResponseDto,
  MailSendDto,
} from './dto/mail.dto';
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';
import {
  GENERIC_PERMISSION_RESOLVE_KEY,
  GenericPermission,
} from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../../auth/guard/generic-permission.guard';

type MailPermissionBody = {
  entityHandle?: string | number;
};

const resolveMailEntityPermission = (
  req: Request<Record<string, string>, unknown, MailPermissionBody>,
) => {
  const body = req.body;

  return {
    entityHandle:
      body?.entityHandle !== undefined ? String(body.entityHandle) : undefined,
  };
};

@ApiTags('Mail')
@ApiBearerAuth()
@Controller('api/mail')
@UseGuards(SessionOrBearerAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('senders')
  @ApiOperation({
    summary: 'List available sender addresses',
    description:
      'Returns the sender addresses that the authenticated user can choose from for the currently configured mail provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available sender addresses grouped by the active provider.',
    type: MailSenderListResponseDto,
  })
  async listSenders(
    @Req() req: Request & { user: PersonItem },
  ): Promise<MailSenderListResponseDto> {
    return this.mailService.listSenderOptions(req.user);
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Render an email preview',
    description:
      'Builds an email draft from entity context, template data, and optional manual overrides without dispatching it.',
  })
  @ApiBody({
    type: MailPreviewDto,
    description:
      'Message draft and rendering context used to resolve recipients, subject, body, and attachments.',
  })
  @ApiResponse({
    status: 201,
    description: 'Resolved email preview with recipients, subject, and rendered body.',
    type: MailPreviewResponseDto,
  })
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowRead')
  @SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolveMailEntityPermission)
  async preview(
    @Req() req: Request & { user: PersonItem },
    @Body() previewDto: MailPreviewDto,
  ): Promise<MailPreviewResponseDto> {
    return this.mailService.previewEmail(previewDto, req.user);
  }

  @Post('send')
  @ApiOperation({
    summary: 'Queue or send an email',
    description:
      'Builds an email from entity context and dispatches it through the configured delivery pipeline.',
  })
  @ApiBody({
    type: MailSendDto,
    description:
      'Message payload that should be rendered and then queued or sent immediately.',
  })
  @ApiResponse({
    status: 201,
    description: 'Persisted email delivery record for the queued or sent message.',
    type: EmailDeliveryItem,
  })
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowUpdate')
  @SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolveMailEntityPermission)
  async send(
    @Req() req: Request & { user: PersonItem },
    @Body() sendDto: MailSendDto,
  ): Promise<EmailDeliveryItem> {
    return this.mailService.sendEmail(sendDto, req.user);
  }
}
