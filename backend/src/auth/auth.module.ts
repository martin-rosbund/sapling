import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionSerializer } from '../session/session.serializer';
import { LocalStrategy } from './local/local.strategy';
import { AzureStrategy } from './azure/azure.strategy';
import { GoogleStrategy } from './google/google.strategy';
import rateLimit from 'express-rate-limit';
import { SAPLING_WHITELISTED_IPS } from 'src/constants/project.constants';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (x) => SAPLING_WHITELISTED_IPS.includes((x.ip ?? '').trim()),
  message: 'login.tooManyRequests',
});

// Authentication module: sets up Passport strategies and controllers
@Module({
  imports: [
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
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(loginLimiter)
      .forRoutes('auth/local/login');
  }
}