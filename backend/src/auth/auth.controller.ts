import { Controller, Post, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { MyAuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  @Post('local/login')
  @UseGuards(AuthGuard('local'))
  localLogin(@Req() req: Request, @Res() res: Response) {
    req.login(req.user as Express.User, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send(req.user);
    });
  }

  @Get('azure/login')
  @UseGuards(AuthGuard('azure-ad'))
  azureLogin() {}

  // Azure AD Callback
  @Post('azure/callback')
  @UseGuards(AuthGuard('azure-ad'))
  azureCallback(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      return res.status(400).send('User not found');
    }
    req.login(req.user, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.redirect('http://localhost:5173');
    });
  }

  // Logout
  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/');
    });
  }

  @Get('isAuthenticated')
  isAuthenticated(@Req() req: Request, @Res() res: Response) {
    if (req.isAuthenticated()) {
      return res.status(200).send({ authenticated: true });
    } else {
      return res.status(401).send({ authenticated: false });
    }
  }
}
