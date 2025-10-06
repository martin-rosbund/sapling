import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionSerializer } from '../session/session.serializer';
import { SaplingStrategy } from '../sapling/sapling.strategy';
import { AzureStrategy } from '../azure/azure.strategy';

@Module({
  imports: [
    PassportModule.register({
      session: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SaplingStrategy, AzureStrategy, SessionSerializer],
})
export class AuthModule {}
