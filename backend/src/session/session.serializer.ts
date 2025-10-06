import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { PersonItem } from 'src/entity/PersonItem';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  // Bestimmt, welche Daten vom User-Objekt in der Session gespeichert werden
  serializeUser(
    person: PersonItem,
    done: (err: Error, user: any) => void,
  ): any {
    // Wir speichern nur die eindeutige OID in der Session
    done(null as unknown as Error, person);
  }

  // Holt die vollständigen User-Daten anhand der in der Session gespeicherten Infos
  deserializeUser(
    payload: any,
    done: (err: Error, payload: PersonItem) => void,
  ): any {
    // In einer echten Anwendung würdest du hier den User aus der DB holen:
    // const user = await this.userService.findById(payload.oid);
    // Fürs Erste geben wir das gespeicherte Payload-Objekt einfach zurück
    done(null as unknown as Error, payload as PersonItem);
  }
}
