import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SaplingController } from './sapling.controller';
import { SaplingStrategy } from './sapling.strategy';
import { SaplingService } from './sapling.service';

@Module({
  imports: [
    PassportModule.register({
      session: true,
    }),
  ],
  controllers: [SaplingController],
  providers: [SaplingStrategy, SaplingService], // Hier wird unsere Strategie als Provider registriert
})
export class SaplingModule {}
