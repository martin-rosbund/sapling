import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
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
import {
  SAPLING_FRONTEND_URL,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  SESSION_REMEMBER_ME_MAX_AGE,
} from '../constants/project.constants';
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
import { createSessionCookieSecurityOptions } from '../session/session.config';
import { AdminPermissionGuard } from './guard/admin-permission.guard';
import type {
  ImpersonatorInfo,
  SessionUserPayload,
} from '../session/session.serializer';

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
      if (req.session?.cookie) {
        const body = req.body as { rememberMe?: unknown } | undefined;
        req.session.cookie.maxAge =
          body?.rememberMe === true
            ? SESSION_REMEMBER_ME_MAX_AGE
            : SESSION_MAX_AGE;
      }
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
   * Logout endpoint (destroys session and clears the auth cookie).
   * @param req Express request object
   * @param res Express response object
   * @returns Success state
   * @route POST /api/auth/logout
   * @access Public
   */
  @Post('logout')
  @ApiOperation({
    summary: 'Logout',
    description: 'Destroys session and clears the authentication cookie.',
  })
  @ApiResponse({ status: 200, description: 'Logout completed successfully' })
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

  /**
   * Ends an impersonation session and returns to the real account.
   * Allowed for the impersonating administrator only.
   *
   * NOTE: This handler MUST be declared before `startImpersonation`,
   * because NestJS registers routes in declaration order. The dynamic
   * route `impersonate/:handle` would otherwise swallow `/impersonate/stop`
   * and trigger the admin guard (which fails while impersonating).
   *
   * @route POST /api/auth/impersonate/stop
   * @access Authenticated
   */
  @Post('impersonate/stop')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stop impersonation',
    description:
      'Ends the current impersonation session and returns to the real account.',
  })
  @ApiResponse({ status: 200, description: 'Impersonation stopped' })
  async stopImpersonation(@Req() req: Request): Promise<{ stopped: boolean }> {
    if (!req.session) {
      return { stopped: false };
    }

    const sessionPassport = (
      req.session as unknown as {
        passport?: { user?: SessionUserPayload };
      }
    ).passport;

    if (!sessionPassport?.user?.impersonatedHandle) {
      return { stopped: false };
    }

    const previousTarget = sessionPassport.user.impersonatedHandle;
    const realHandle = sessionPassport.user.handle;

    sessionPassport.user = { handle: realHandle };

    await new Promise<void>((resolve, reject) =>
      req.session!.save((error) => (error ? reject(error) : resolve())),
    );

    global.log?.info?.(
      `[impersonation] stop: admin handle=${realHandle} (was viewing target handle=${previousTarget})`,
    );

    return { stopped: true };
  }

  /**
   * Starts an "view as user" impersonation session. Administrators only.
   * Mutates the existing session payload so the next request deserializes
   * the target user. The original admin remains the session owner.
   *
   * @route POST /api/auth/impersonate/:handle
   * @access Administrator (session-based)
   */
  @Post('impersonate/:handle')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Impersonate another user',
    description:
      'Administrators only. Switches the current session to view the application as the specified user. The session remains owned by the administrator.',
  })
  @ApiParam({ name: 'handle', type: Number })
  @ApiResponse({ status: 200, description: 'Impersonation started' })
  @ApiResponse({ status: 400, description: 'Invalid impersonation target' })
  @ApiResponse({ status: 403, description: 'Not allowed' })
  @ApiResponse({ status: 404, description: 'Target user not found' })
  @UseGuards(AdminPermissionGuard)
  async startImpersonation(
    @Req() req: Request,
    @Param('handle') handle: string,
  ): Promise<{ impersonator: ImpersonatorInfo; targetHandle: number }> {
    const realUser = req.user as PersonItem | undefined;
    if (
      !realUser ||
      typeof realUser.handle !== 'number' ||
      !req.session ||
      !req.isAuthenticated()
    ) {
      throw new ForbiddenException('global.permissionDenied');
    }

    // Prevent nested impersonation – must stop first.
    if (
      (realUser as PersonItem & { _impersonator?: ImpersonatorInfo })
        ._impersonator
    ) {
      throw new ForbiddenException('permission.impersonationAlreadyActive');
    }

    const targetHandle = Number(handle);
    if (!Number.isFinite(targetHandle) || targetHandle <= 0) {
      throw new BadRequestException('global.invalidHandle');
    }

    if (targetHandle === realUser.handle) {
      throw new BadRequestException('permission.cannotImpersonateSelf');
    }

    const target = await this.authService.getSecurityUserByHandle(targetHandle);
    if (!target) {
      throw new NotFoundException('global.notFound');
    }
    if (target.isActive === false) {
      throw new BadRequestException('permission.targetInactive');
    }

    const sessionPassport = (
      req.session as unknown as {
        passport?: { user?: SessionUserPayload };
      }
    ).passport;

    if (!sessionPassport || !sessionPassport.user) {
      throw new ForbiddenException('global.permissionDenied');
    }

    sessionPassport.user = {
      handle: realUser.handle,
      impersonatedHandle: targetHandle,
    };

    await new Promise<void>((resolve, reject) =>
      req.session!.save((error) => (error ? reject(error) : resolve())),
    );

    global.log?.info?.(
      `[impersonation] start: admin handle=${realUser.handle} (${realUser.firstName} ${realUser.lastName}) → target handle=${targetHandle} (${target.firstName} ${target.lastName})`,
    );

    return {
      impersonator: {
        handle: realUser.handle,
        firstName: realUser.firstName,
        lastName: realUser.lastName,
      },
      targetHandle,
    };
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
