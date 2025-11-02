import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { CurrentService } from './current.service';
import { PersonItem } from 'src/entity/PersonItem';
import { ENTITY_NAMES } from '../../entity/global/entity.registry';
import type { Request } from 'express';
import { ApiParam } from '@nestjs/swagger';

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

  /**
   * Returns all entity permissions for the current user.
   */
  @Get('permission')
  getAllEntityPermissions(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getAllEntityPermissions(user);
  }

  /**
   * Returns entity permissions for the current user and a specific entity.
   */
  @Get('permission/:entityName')
  @ApiParam({
    name: 'entityName',
    description: 'Der Name der Entität', // The name of the entity
    enum: ENTITY_NAMES,
  })
  getEntityPermission(
    @Req() req: Request,
    @Param('entityName') entityName: string,
  ) {
    const user = req.user as PersonItem;
    if (!entityName) {
      throw new BadRequestException('entityName is required');
    }
    return this.currentService.getEntityPermissions(user, entityName);
  }

    /**
   * Returns all entity permissions for the current user.
   */
  @Get('workWeek')
  getWorkWeek(@Req() req: Request) {
    const user = req.user as PersonItem;
    return this.currentService.getWorkWeek(user);
  }
}
