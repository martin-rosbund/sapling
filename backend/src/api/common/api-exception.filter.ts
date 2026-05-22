import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import {
  buildErrorDiagnostics,
  stringifyErrorForLog,
} from './error-diagnostics.util';

type ErrorResponseBody = {
  statusCode: number;
  message: string;
  error?: string;
  requestId: string;
  path: string;
  method: string;
  timestamp: string;
  details?: unknown;
  technical?: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = randomUUID();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const normalizedResponse = this.normalizeExceptionResponse(
      exceptionResponse,
      status,
    );
    const diagnostics = buildErrorDiagnostics(exception);
    const responseTechnical = this.isRecord(normalizedResponse.technical)
      ? normalizedResponse.technical
      : {};
    const payload: ErrorResponseBody = {
      statusCode: status,
      message: normalizedResponse.message,
      error: normalizedResponse.error,
      requestId,
      path: request.originalUrl ?? request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      details: normalizedResponse.details,
      technical: {
        ...responseTechnical,
        ...(responseTechnical.exception == null
          ? { exception: diagnostics }
          : { httpException: diagnostics }),
      },
    };

    this.logException(request, payload, exception);
    response.status(status).json(payload);
  }

  private normalizeExceptionResponse(
    exceptionResponse: unknown,
    status: number,
  ): {
    message: string;
    error?: string;
    details?: unknown;
    technical?: unknown;
  } {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        error: undefined,
      };
    }

    if (this.isRecord(exceptionResponse)) {
      const messageValue = exceptionResponse.message;
      const message = Array.isArray(messageValue)
        ? messageValue.join(', ')
        : typeof messageValue === 'string'
          ? messageValue
          : status >= 500
            ? 'exception.serverException'
            : 'exception.unknownError';
      const error =
        typeof exceptionResponse.error === 'string'
          ? exceptionResponse.error
          : undefined;

      return {
        message,
        error,
        details: exceptionResponse.details,
        technical: exceptionResponse.technical,
      };
    }

    return {
      message:
        status >= 500 ? 'exception.serverException' : 'exception.unknownError',
      error: undefined,
    };
  }

  private logException(
    request: Request,
    payload: ErrorResponseBody,
    exception: unknown,
  ) {
    const logPayload = {
      requestId: payload.requestId,
      method: payload.method,
      path: payload.path,
      statusCode: payload.statusCode,
      user: this.getRequestUserHandle(request),
      query: request.query,
      body: this.redactValue(request.body),
      error: JSON.parse(stringifyErrorForLog(exception)),
    };

    global.log?.error?.('http exception:', logPayload);
  }

  private getRequestUserHandle(request: Request): string | number | null {
    const user = (request as Request & { user?: unknown }).user;
    if (!this.isRecord(user)) {
      return null;
    }

    const handle = user.handle;
    return typeof handle === 'string' || typeof handle === 'number'
      ? handle
      : null;
  }

  private redactValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }

    if (!this.isRecord(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        /password|secret|token|authorization|cookie/i.test(key)
          ? '[redacted]'
          : this.redactValue(entryValue),
      ]),
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
