import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PersonItem } from '../../entity/PersonItem';
import { MyAuthGuard } from '../../auth/auth.guard';
import { MailService } from './mail.service';
import {
  MailPreviewDto,
  MailPreviewResponseDto,
  MailSendDto,
} from './dto/mail.dto';
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';

@ApiTags('Mail')
@Controller('api/mail')
@UseGuards(MyAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Render an email preview from entity context' })
  @ApiBody({ type: MailPreviewDto })
  @ApiResponse({ status: 201, type: MailPreviewResponseDto })
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
  async send(
    @Req() req: Request & { user: PersonItem },
    @Body() sendDto: MailSendDto,
  ): Promise<EmailDeliveryItem> {
    return this.mailService.sendEmail(sendDto, req.user);
  }
}
