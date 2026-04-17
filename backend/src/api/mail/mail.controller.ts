import {
  Body,
  Controller,
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
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';
import { MailService } from './mail.service';
import {
  MailPreviewDto,
  MailPreviewResponseDto,
  MailSendDto,
} from './dto/mail.dto';
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';
import {
  GENERIC_PERMISSION_RESOLVE_KEY,
  GenericPermission,
} from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../generic/generic-permission.guard';

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

  @Post('preview')
  @ApiOperation({ summary: 'Render an email preview from entity context' })
  @ApiBody({ type: MailPreviewDto })
  @ApiResponse({ status: 201, type: MailPreviewResponseDto })
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
  @ApiOperation({ summary: 'Queue or dispatch an email from entity context' })
  @ApiBody({ type: MailSendDto })
  @ApiResponse({ status: 201, type: EmailDeliveryItem })
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
