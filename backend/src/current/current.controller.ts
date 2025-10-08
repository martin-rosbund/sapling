import { Controller, Get, Req } from '@nestjs/common';
import { CurrentService } from './current.service';
import { PersonItem } from 'src/entity/PersonItem';
import type { Request, Response } from 'express';

@Controller('current')
export class CurrentController {
  constructor(private readonly currentService: CurrentService) {}

  @Get('person')
  getPerson(@Req() req: Request): PersonItem {
    return req.user as PersonItem;
  }
}
