import { Controller, Get, Req, UseGuards, Res, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Controller('azure')
export class AzureController {
  // 1. Route: Startet den Login-Prozess
  @Get('login')
  @UseGuards(AuthGuard('azure-ad'))
  login() {
    // Der Guard leitet automatisch zu Azure AD weiter.
    // Diese Funktion wird also nie direkt ausgeführt.
  }

  // 2. Route: Azure AD leitet den Benutzer hierhin zurück
  @Post('callback')
  @UseGuards(AuthGuard('azure-ad'))
  callback(@Res() res: Response) {
    // Nach erfolgreichem Login leiten wir den Benutzer zum Frontend weiter.
    res.redirect('/'); // Oder zu einem Dashboard: '/dashboard'
  }

  // 3. Route: Eine geschützte Route zum Testen
  @Get('profile')
  @UseGuards(AuthGuard('session')) // Schützt diese Route
  getProfile(@Req() req: Request) {
    // Dank der validate() Methode in der Strategie haben wir hier `req.user`
    return req.user;
  }

  // 4. Route: Logout
  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/');
    });
  }
}
