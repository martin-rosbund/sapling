import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionSerializer } from '../session/session.serializer';
import { LocalStrategy } from './local/local.strategy';
import { AzureStrategy } from './azure/azure.strategy';
import { GoogleStrategy } from './google/google.strategy';

// Authentication module: sets up Passport strategies and controllers
@Module({
  imports: [
    PassportModule.register({
      session: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, AzureStrategy, GoogleStrategy, SessionSerializer],
})
export class AuthModule {}
