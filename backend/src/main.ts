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
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import log4js from 'log4js';

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

  // Einstellungen für Morgan Request Logger
  const accessLogStream = createStream(
    process.env.LOG_NAME_REQUESTS || 'request.log',
    {
      interval: '1d', // rotate daily
      size: '10M', // 10 MegaByte
      path: process.env.LOG_OUTPUT_PATH || '../log',
      maxFiles: parseInt(process.env.LOG_BACKUP_FILES || '14'),
    },
  );

  // Morgan Request Logger
  app.use(morgan('dev'));
  app.use(morgan('combined', { stream: accessLogStream }));

  log4js.configure({
    appenders: {
      file: {
        type: 'dateFile',
        filename: `${process.env.LOG_OUTPUT_PATH}/${process.env.LOG_NAME_SERVER || 'server.log'}`,
        compress: false,
        numBackups: parseInt(process.env.LOG_BACKUP_FILES || '14'),
      },
      console: { type: 'console' },
    },
    categories: {
      default: {
        appenders: ['file', 'console'],
        level: process.env.LOG_LEVEL || 'info',
      },
    },
  });

  // Globale Variable für Log4JS
  global.log = log4js.getLogger('default');

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

  app.enableCors({
    // Erlaube Anfragen nur vom eigenen Frontend
    origin: process.env.SAPLING_FRONTEND_URL,
    // Erlaube das Senden von Cookies und anderen Credentials
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
