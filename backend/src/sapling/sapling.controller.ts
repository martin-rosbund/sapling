import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import { SaplingService } from './sapling.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

export interface LoginItem {
  loginName: string;
  loginPassword: string;
}

@Controller('Sapling')
export class SaplingController {
  constructor(private readonly saplingService: SaplingService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Req() req: Request) {
    return req.user;
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/');
    });
  }
}
