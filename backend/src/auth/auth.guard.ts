/**
 * @class MyAuthGuard
 * @version         1.0
 * @author          [Your Name]
 * @summary         Custom authentication guard to check if user is present in request.
 *
 * @method          canActivate         Checks if user is present in request
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MyAuthGuard implements CanActivate {
  /**
   * Checks if user is present in request.
   * @param {ExecutionContext} context Execution context
   * @returns {boolean} True if user is present, otherwise throws UnauthorizedException
   */
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
