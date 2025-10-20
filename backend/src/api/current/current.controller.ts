import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { CurrentService } from './current.service';
import { PersonItem } from 'src/entity/PersonItem';
import type { Request } from 'express';

@Controller('current')
export class CurrentController {
  constructor(private readonly currentService: CurrentService) {}

  @Get('person')
  getPerson(@Req() req: Request): PersonItem {
    return req.user as PersonItem;
  }

  @Post('changePassword')
  async changePassword(
    @Req() req: Request,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ): Promise<void> {
    if (!newPassword || !confirmPassword) {
      throw new BadRequestException('login.passwordRequired');
    }
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('login.passwordsDoNotMatch');
    }
    const user = req.user as PersonItem;
    await this.currentService.changePassword(user, newPassword);
  }
}
