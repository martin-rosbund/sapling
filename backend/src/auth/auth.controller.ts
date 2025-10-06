import { Controller, Post, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Controller('auth') // Ein einheitliches Prefix für alle Auth-Routen
export class AuthController {
  // Lokaler Login (vorher Sapling)
  @Post('local/login')
  @UseGuards(AuthGuard('local')) // Nutzt die LocalStrategy
  localLogin(@Req() req: Request) {
    return req.user;
  }

  // Azure AD Login
  @Get('azure/login')
  @UseGuards(AuthGuard('azure-ad')) // Nutzt die AzureADStrategy
  azureLogin() {
    // Leitet automatisch weiter
  }

  // Azure AD Callback
  @Get('azure/callback')
  @UseGuards(AuthGuard('azure-ad'))
  azureCallback(@Res() res: Response) {
    res.redirect('/dashboard'); // Oder wohin auch immer
  }

  // Logout
  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/');
    });
  }
}
