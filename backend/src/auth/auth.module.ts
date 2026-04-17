import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionSerializer } from '../session/session.serializer';
import { LocalStrategy } from './local/local.strategy';
import { AzureStrategy } from './azure/azure.strategy';
import { GoogleStrategy } from './google/google.strategy';
import rateLimit from 'express-rate-limit';
import { SAPLING_WHITELISTED_IPS } from '../constants/project.constants';
import { SessionOrBearerAuthGuard } from './session-or-token-auth.guard';
import { CurrentService } from '../api/current/current.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../entity/global/entity.registry';
import { GenericPermissionGuard } from '../api/generic/generic-permission.guard';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Authentication module: sets up Passport strategies and controllers.
 *
 * @property        loginLimiter         Rate limiter middleware for login endpoint
 * @property        imports             Imported modules (PassportModule)
 * @property        controllers         Controllers used in this module (AuthController)
 * @property        providers           Providers used in this module (AuthService, strategies, serializer)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (x) => SAPLING_WHITELISTED_IPS.includes((x.ip ?? '').trim()),
  message: 'login.tooManyRequests',
});

@Module({
  imports: [
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new (...args: any[]) => unknown),
    ),
    PassportModule.register({
      session: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    AzureStrategy,
    GoogleStrategy,
    SessionSerializer,
    SessionOrBearerAuthGuard,
    GenericPermissionGuard,
    CurrentService,
  ],
  exports: [AuthService, SessionOrBearerAuthGuard],
})
export class AuthModule implements NestModule {
  /**
   * Configures middleware for the module.
   * Applies rate limiter to the local login route.
   * @param consumer MiddlewareConsumer instance
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(loginLimiter).forRoutes('auth/local/login');
  }
}
