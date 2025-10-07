import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MikroORM } from '@mikro-orm/core';
import config from './database/mikro-orm.config';
import { DatabaseSeeder } from './database/seeder/DatabaseSeeder';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      secret: process.env.SAPLING_SECRET || '',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3600000,
        secure: false,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const orm = await MikroORM.init(config);
  await orm.getMigrator().up();
  await orm.seeder.seed(DatabaseSeeder);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Sapling API')
    .setDescription('API-Documentation for Sapling.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('swagger', app, document);

  //await generator.createSchema(); // Erstellt die Datenbanktabellen, falls sie noch nicht existieren
  //await generator.updateSchema(); // Aktualisiert die Tabellenstruktur basierend auf den Entities

  app.enableCors({
    // Erlaube Anfragen nur vom eigenen Frontend
    origin: process.env.SAPLING_FRONTEND_URL,
    // Erlaube das Senden von Cookies und anderen Credentials
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
