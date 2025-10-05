import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MikroORM } from '@mikro-orm/core';
import config from './database/mikro-orm.config';
import { DatabaseSeeder } from './database/seeder/DatabaseSeeder';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const orm = await MikroORM.init(config);

  await orm.getMigrator().up();
  await orm.seeder.seed(DatabaseSeeder);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true, 
  }));

  const swagger = new DocumentBuilder()
    .setTitle('Meine Generische API')
    .setDescription('API-Dokumentation für alle Entitäten')
    .setVersion('1.0')
    .addTag('Generic API')
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('swagger', app, document);

  //await generator.createSchema(); // Erstellt die Datenbanktabellen, falls sie noch nicht existieren
  //await generator.updateSchema(); // Aktualisiert die Tabellenstruktur basierend auf den Entities

  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
