import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module'; // Dein UsersModule
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionSerializer } from './session.serializer'; // Der EINE Serializer
import { LocalStrategy } from './local.strategy';       // Deine Sapling/Local Strategie
import { AzureADStrategy } from './azure-ad.strategy'; // Deine Azure Strategie

@Module({
  imports: [
    UsersModule, // Für den Zugriff auf den UsersService
    PassportModule.register({
      session: true, // Einmaliger Aufruf für die gesamte App
    }),
  ],
  controllers: [AuthController], // Ein Controller für alle Auth-Routen
  providers: [
    AuthService,
    LocalStrategy,   // Beide Strategien hier registrieren
    AzureADStrategy,
    SessionSerializer, // Den Serializer hier registrieren
  ],
})
export class AuthModule {}