import { Controller, Post, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

/**
 * Controller for authentication endpoints (local, Azure AD, Google)
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  /**
   * Local login endpoint using Passport local strategy.
   * @param req Express request object
   * @param res Express response object
   * @returns Authenticated user object
   */
  @Post('local/login')
  @ApiOperation({
    summary: 'Local login',
    description: 'Authenticate user using local strategy.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username' },
        password: { type: 'string', description: 'Password' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user object',
    type: Object,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('local'))
  localLogin(@Req() req: Request, @Res() res: Response) {
    req.login(req.user as Express.User, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send(req.user);
    });
  }

  /**
   * Azure AD login endpoint (redirects to Azure login).
   * @returns Redirect to Azure AD login
   */
  @Get('azure/login')
  @ApiOperation({
    summary: 'Azure AD login',
    description: 'Redirects to Azure AD login.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Azure AD login' })
  @UseGuards(AuthGuard('azure-ad'))
  azureLogin() {}

  /**
   * Azure AD callback endpoint (handles Azure login response).
   * @param req Express request object
   * @param res Express response object
   * @returns Redirect to frontend or error
   */
  @Post('azure/callback')
  @ApiOperation({
    summary: 'Azure AD callback',
    description: 'Handles Azure AD login response.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to frontend on success' })
  @ApiResponse({ status: 400, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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

  /**
   * Google login endpoint (redirects to Google login).
   * @returns Redirect to Google login
   */
  @Get('google/login')
  @ApiOperation({
    summary: 'Google login',
    description: 'Redirects to Google login.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google login' })
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  /**
   * Google callback endpoint (handles Google login response).
   * @param req Express request object
   * @param res Express response object
   * @returns Redirect to frontend or error
   */
  @Get('google/callback')
  @ApiOperation({
    summary: 'Google callback',
    description: 'Handles Google login response.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to frontend on success' })
  @ApiResponse({ status: 400, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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

  /**
   * Logout endpoint (destroys session and redirects).
   * @param req Express request object
   * @param res Express response object
   * @returns Redirect to homepage
   */
  @Get('logout')
  @ApiOperation({
    summary: 'Logout',
    description: 'Destroys session and redirects to homepage.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to homepage' })
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout(() => {
      res.redirect('/');
    });
  }

  /**
   * Checks if the user is authenticated (session-based).
   * @param req Express request object
   * @param res Express response object
   * @returns Authenticated status
   */
  @Get('isAuthenticated')
  @ApiOperation({
    summary: 'Check authentication',
    description: 'Checks if the user is authenticated (session-based).',
  })
  @ApiResponse({
    status: 200,
    description: 'User is authenticated',
    schema: {
      type: 'object',
      properties: { authenticated: { type: 'boolean' } },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User is not authenticated',
    schema: {
      type: 'object',
      properties: { authenticated: { type: 'boolean' } },
    },
  })
  isAuthenticated(@Req() req: Request, @Res() res: Response) {
    if (req.isAuthenticated()) {
      return res.status(200).send({ authenticated: true });
    } else {
      return res.status(401).send({ authenticated: false });
    }
  }
}
