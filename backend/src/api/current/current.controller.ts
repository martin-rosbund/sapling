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

// Controller for endpoints related to the current user (profile, password)

@Controller('current')
export class CurrentController {
  /**
   * Injects the CurrentService for user operations.
   * @param currentService - Service for current user logic
   */
  constructor(private readonly currentService: CurrentService) {}

  /**
   * Returns the current logged-in user (PersonItem) from the request.
   * @param req - The request object
   * @returns The current user as PersonItem
   */
  @Get('person')
  getPerson(@Req() req: Request): PersonItem {
    return req.user as PersonItem;
  }

  /**
   * Changes the password for the current user.
   * @param req - The request object
   * @param newPassword - The new password
   * @param confirmPassword - The confirmation of the new password
   * @throws BadRequestException if passwords are missing or do not match
   */
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

  @Get('openTickets')
  async getOpenTickets(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getOpenTickets(user);
  }

  @Get('openEvents')
  async getOpenEvents(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getOpenEvents(user);
  }

  @Get('countOpenTasks')
  async countOpenTasks(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.countOpenTasks(user);
  }
}
