import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
// Custom authentication guard to check if user is present in request
export class MyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: any }>();
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
