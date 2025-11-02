import { Controller, Post, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

// Controller for authentication endpoints (local and Azure AD)

@Controller('auth')
export class AuthController {
  // Local login endpoint using Passport local strategy
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

  // Azure AD login endpoint (redirects to Azure login)
  @Get('azure/login')
  @UseGuards(AuthGuard('azure-ad'))
  azureLogin() {}

  // Azure AD callback endpoint (handles Azure login response)
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

  // Google login endpoint (redirects to Google login)
  @Get('google/login')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  // Google callback endpoint (handles Google login response)
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
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

  // Logout endpoint (destroys session and redirects)
  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/');
    });
  }

  // Checks if the user is authenticated (session-based)
  @Get('isAuthenticated')
  isAuthenticated(@Req() req: Request, @Res() res: Response) {
    if (req.isAuthenticated()) {
      return res.status(200).send({ authenticated: true });
    } else {
      return res.status(401).send({ authenticated: false });
    }
  }
}
