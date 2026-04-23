import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SAPLING_FRONTEND_URL } from '../constants/project.constants';
import { SessionOrBearerAuthGuard } from './guard/session-or-token-auth.guard';
import { AuthService } from './auth.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { RotateApiTokenDto } from './dto/rotate-api-token.dto';
import {
  ApiTokenResponseDto,
  ApiTokenSecretResponseDto,
} from './dto/api-token-response.dto';
import {
  GenericPermission,
  GenericPermissionEntity,
} from '../api/generic/generic.decorator';
import { GenericPermissionGuard } from './guard/generic-permission.guard';
import { PersonItem } from '../entity/PersonItem';
import { SESSION_COOKIE_NAME } from '../constants/project.constants';
import { createSessionCookieSecurityOptions } from '../session/session.config';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for authentication endpoints (local, Azure AD, Google).
 *
 * @method          localLogin           Local login endpoint using Passport local strategy
 * @method          azureLogin           Azure AD login endpoint (redirects to Azure login)
 * @method          azureCallback        Azure AD callback endpoint (handles Azure login response)
 * @method          googleLogin          Google login endpoint (redirects to Google login)
 * @method          googleCallback       Google callback endpoint (handles Google login response)
 * @method          logout               Logout endpoint (destroys session and redirects)
 * @method          isAuthenticated      Checks if the user is authenticated (session-based)
 */
@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private completeLogin(
    req: Request,
    res: Response,
    onSuccess: (user: Express.User) => void,
  ): void {
    const user = req.user;

    if (!user) {
      res.status(400).send('User not found');
      return;
    }

    const establishLogin = () => {
      req.login(user, (error) => {
        if (error) {
          res.status(500).send(error);
          return;
        }

        onSuccess(user);
      });
    };

    if (!req.session) {
      establishLogin();
      return;
    }

    req.session.regenerate((error) => {
      if (error) {
        res.status(500).send(error);
        return;
      }

      establishLogin();
    });
  }

  /**
   * Local login endpoint using Passport local strategy.
   * @param req Express request object
   * @param res Express response object
   * @returns Authenticated user object
   * @route POST /api/auth/local/login
   * @access Public
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
    this.completeLogin(req, res, () => {
      res.send();
    });
  }

  /**
   * Azure AD login endpoint (redirects to Azure login).
   * @returns Redirect to Azure AD login
   * @route GET /api/auth/azure/login
   * @access Public
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
   * @route GET /api/auth/azure/callback
   * @access Public
   */
  @Get('azure/callback')
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
    this.completeLogin(req, res, () => {
      res.redirect(SAPLING_FRONTEND_URL);
    });
  }

  /**
   * Google login endpoint (redirects to Google login).
   * @returns Redirect to Google login
   * @route GET /api/auth/google/login
   * @access Public
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
   * @route GET /api/auth/google/callback
   * @access Public
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
    this.completeLogin(req, res, () => {
      res.redirect(SAPLING_FRONTEND_URL);
    });
  }

  /**
   * Logout endpoint (destroys session and redirects).
   * @param req Express request object
   * @param res Express response object
   * @returns Redirect to homepage
   * @route GET /api/auth/logout
   * @access Public
   */
  @Get('logout')
  @ApiOperation({
    summary: 'Logout',
    description: 'Destroys session and redirects to homepage.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to homepage' })
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout((logoutError) => {
      if (logoutError) {
        res.status(500).send(logoutError);
        return;
      }

      if (!req.session) {
        res.clearCookie(
          SESSION_COOKIE_NAME,
          createSessionCookieSecurityOptions(),
        );
        res.status(200).send({ success: true });
        return;
      }

      req.session.destroy((sessionError) => {
        if (sessionError) {
          res.status(500).send(sessionError);
          return;
        }

        res.clearCookie(
          SESSION_COOKIE_NAME,
          createSessionCookieSecurityOptions(),
        );
        res.status(200).send({ success: true });
      });
    });
  }

  /**
   * Checks if the user is authenticated (session-based).
   * @param req Express request object
   * @param res Express response object
   * @returns Authenticated status
   * @route GET /api/auth/isAuthenticated
   * @access Public
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

  @Get('token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List API tokens',
    description:
      'Returns API token metadata for the current user or another person when globally permitted.',
  })
  @ApiQuery({ name: 'personHandle', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of API token metadata',
    type: ApiTokenResponseDto,
    isArray: true,
  })
  @UseGuards(SessionOrBearerAuthGuard, GenericPermissionGuard)
  @GenericPermission('allowRead')
  @GenericPermissionEntity('personApiToken')
  listTokens(
    @Req() req: Request & { user: PersonItem },
    @Query('personHandle') personHandle?: number,
  ): Promise<ApiTokenResponseDto[]> {
    return this.authService.getApiTokens(req.user, personHandle);
  }

  @Post('token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create API token',
    description:
      'Creates a new bearer token for the current user or another person when globally permitted.',
  })
  @ApiBody({ type: CreateApiTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Created token and one-time secret',
    type: ApiTokenSecretResponseDto,
  })
  @UseGuards(SessionOrBearerAuthGuard, GenericPermissionGuard)
  @GenericPermission('allowInsert')
  @GenericPermissionEntity('personApiToken')
  createToken(
    @Req() req: Request & { user: PersonItem },
    @Body() dto: CreateApiTokenDto,
  ): Promise<ApiTokenSecretResponseDto> {
    return this.authService.createApiToken(req.user, dto);
  }

  @Post('token/:handle/rotate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rotate API token',
    description:
      'Deactivates the current token and returns a replacement secret.',
  })
  @ApiParam({ name: 'handle', type: Number })
  @ApiBody({ type: RotateApiTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Rotated token and one-time secret',
    type: ApiTokenSecretResponseDto,
  })
  @UseGuards(SessionOrBearerAuthGuard, GenericPermissionGuard)
  @GenericPermission('allowUpdate')
  @GenericPermissionEntity('personApiToken')
  rotateToken(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Body() dto: RotateApiTokenDto,
  ): Promise<ApiTokenSecretResponseDto> {
    return this.authService.rotateApiToken(req.user, handle, dto);
  }

  @Delete('token/:handle')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate API token',
    description: 'Deactivates a bearer token.',
  })
  @ApiParam({ name: 'handle', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Updated token metadata',
    type: ApiTokenResponseDto,
  })
  @UseGuards(SessionOrBearerAuthGuard, GenericPermissionGuard)
  @GenericPermission('allowDelete')
  @GenericPermissionEntity('personApiToken')
  deactivateToken(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
  ): Promise<ApiTokenResponseDto> {
    return this.authService.deactivateApiToken(req.user, handle);
  }
}
