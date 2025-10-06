import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AzureController } from './azure.controller';
import { AzureStrategy } from './azure.strategy';

@Module({
  imports: [
    PassportModule.register({
      session: true,
    }),
  ],
  controllers: [AzureController],
  providers: [AzureStrategy], // Hier wird unsere Strategie als Provider registriert
})
export class AzureModule {}
