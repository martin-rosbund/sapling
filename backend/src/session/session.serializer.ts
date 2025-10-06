import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  // Bestimmt, welche Daten vom User-Objekt in der Session gespeichert werden
  serializeUser(
    user: Express.User,
    done: (err: Error, user: Express.User) => void,
  ): any {
    // Wir speichern nur die eindeutige OID in der Session
    done(null as unknown as Error, user);
  }

  // Holt die vollständigen User-Daten anhand der in der Session gespeicherten Infos
  deserializeUser(
    payload: Express.User,
    done: (err: Error, payload: Express.User) => void,
  ): any {
    // In einer echten Anwendung würdest du hier den User aus der DB holen:
    // const user = await this.userService.findById(payload.oid);
    // Fürs Erste geben wir das gespeicherte Payload-Objekt einfach zurück
    done(null as unknown as Error, payload);
  }
}
