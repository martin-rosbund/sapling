import 'reflect-metadata';
import * as dotenv from 'dotenv';

import { EntityManager } from '@mikro-orm/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';
import express from 'express';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import {
  API_CONTACT_EMAIL,
  API_CONTACT_NAME,
  API_CONTACT_URL,
  API_DESCRIPTION,
  API_TITLE,
  API_VERSION,
  LOG_BACKUP_FILES,
  LOG_NAME_REQUESTS,
  LOG_OUTPUT_PATH,
  PORT,
  SAPLING_FRONTEND_URL,
} from './constants/project.constants';
import { ENTITY_REGISTRY } from './entity/global/entity.registry';
import { initializeLogger } from './logging/initialize-logger';
import {
  applySessionTrustProxy,
  createSessionOptions,
  getSaplingSecretOrThrow,
} from './session/session.config';

type ModelConstructor = abstract new (...args: never[]) => unknown;
type ProxyConfigurableApp = { set(setting: string, value: unknown): unknown };

/**
 * Bootstraps the NestJS application, configures middleware, logging, ORM, Swagger, and CORS.
 *
 * - Sets up session management and request parsing.
 * - Configures Morgan and log4js for request and server logging.
 * - Initializes Passport for authentication.
 * - Applies global validation pipes.
 * - Sets up Swagger API documentation.
 * - Enables CORS for the frontend.
 * - Starts the server on the configured port.
 */
async function bootstrap() {
  dotenv.config();
  getSaplingSecretOrThrow();

  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // Enable URL-encoded request parsing
  app.use(express.urlencoded({ extended: true }));

  // Configure session management
  const httpAdapterInstance = app
    .getHttpAdapter()
    .getInstance() as ProxyConfigurableApp;
  applySessionTrustProxy(httpAdapterInstance);
  const entityManager = app.get(EntityManager);
  app.use(session(createSessionOptions(entityManager)));

  // Configure Morgan request logger with rotating file stream
  const accessLogStream = createStream(LOG_NAME_REQUESTS, {
    interval: '1d', // rotate daily
    size: '10M', // 10 Megabytes
    path: LOG_OUTPUT_PATH,
    maxFiles: LOG_BACKUP_FILES,
  });

  // Use Morgan for request logging (console and file)
  app.use(morgan('dev'));
  app.use(morgan('combined', { stream: accessLogStream }));

  initializeLogger();

  // Initialize Passport authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Apply global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Configure Swagger API documentation
  const swagger = new DocumentBuilder()
    .setTitle(API_TITLE)
    .setDescription(API_DESCRIPTION)
    .setVersion(API_VERSION)
    .setContact(API_CONTACT_NAME, API_CONTACT_URL, API_CONTACT_EMAIL)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swagger, {
    extraModels: ENTITY_REGISTRY.map(
      (e): ModelConstructor => e.class as ModelConstructor,
    ),
  });
  SwaggerModule.setup('api/swagger', app, document);

  // Enable CORS for the frontend
  app.enableCors({
    // Allow requests only from the configured frontend
    origin: SAPLING_FRONTEND_URL,
    // Allow sending cookies and other credentials
    credentials: true,
  });

  // Start the server
  await app.listen(PORT);

  // Set global isReady flag to true
  global.isReady = true;
}

// Start the application
void bootstrap();
