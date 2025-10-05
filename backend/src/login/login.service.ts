import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class LoginService {
  validateUser(email: string, pass: string): any {
    console.log('Empfangene Daten:', { email, pass });
    if (email === 'admin' && pass === 'admin') {
      return { message: 'Login erfolgreich!', user: { email } };
    }
    throw new UnauthorizedException('Ungültige Anmeldedaten');
  }
}