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

/**
 * Bootstraps the NestJS application, configures middleware, logging, ORM, Swagger, and CORS.
 *
 * - Sets up session management and request parsing.
 * - Configures Morgan and log4js for request and server logging.
 * - Initializes Passport for authentication.
 * - Runs database migrations and seeds initial data.
 * - Applies global validation pipes.
 * - Sets up Swagger API documentation.
 * - Enables CORS for the frontend.
 * - Starts the server on the configured port.
 */
async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // Enable URL-encoded request parsing
  app.use(express.urlencoded({ extended: true }));

  // Configure session management
  app.use(
    session({
      secret: process.env.SAPLING_SECRET || '',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3600000, // 1 hour
        secure: false,
      },
    }),
  );

  // Configure Morgan request logger with rotating file stream
  const accessLogStream = createStream(
    process.env.LOG_NAME_REQUESTS || 'request.log',
    {
      interval: '1d', // rotate daily
      size: '10M', // 10 Megabytes
      path: process.env.LOG_OUTPUT_PATH || '../log',
      maxFiles: parseInt(process.env.LOG_BACKUP_FILES || '14'),
    },
  );

  // Use Morgan for request logging (console and file)
  app.use(morgan('dev'));
  app.use(morgan('combined', { stream: accessLogStream }));

  // Configure log4js for server logging
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

  // Set global log4js logger
  global.log = log4js.getLogger('default');

  // Initialize Passport authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Initialize MikroORM, run migrations, and seed database
  const orm = await MikroORM.init(config);
  await orm.getMigrator().up();
  await orm.seeder.seed(DatabaseSeeder);

  // Apply global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Configure Swagger API documentation
  const swagger = new DocumentBuilder()
    .setTitle('Sapling API')
    .setDescription('API-Documentation for Sapling.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('swagger', app, document);

  // Enable CORS for the frontend
  app.enableCors({
    // Allow requests only from the configured frontend
    origin: process.env.SAPLING_FRONTEND_URL,
    // Allow sending cookies and other credentials
    credentials: true,
  });

  // Start the server
  await app.listen(process.env.PORT ?? 3000);
}

// Start the application
void bootstrap();
