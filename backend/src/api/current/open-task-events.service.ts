import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

type OpenTaskSubscriber = () => void;

@Injectable()
export class OpenTaskEventsService {
  private readonly subscribers = new Map<number, Set<OpenTaskSubscriber>>();

  streamForUser(userHandle: number | null | undefined): Observable<void> {
    return new Observable<void>((subscriber) => {
      if (typeof userHandle !== 'number' || !Number.isFinite(userHandle)) {
        subscriber.complete();
        return undefined;
      }

      const listeners = this.getOrCreateSubscribers(userHandle);
      const listener: OpenTaskSubscriber = () => subscriber.next();
      listeners.add(listener);

      subscriber.next();

      return () => {
        const registeredListeners = this.subscribers.get(userHandle);
        registeredListeners?.delete(listener);

        if (registeredListeners && registeredListeners.size === 0) {
          this.subscribers.delete(userHandle);
        }
      };
    });
  }

  notifyUsers(userHandles: Iterable<number | null | undefined>): void {
    const uniqueHandles = new Set<number>();

    for (const userHandle of userHandles) {
      if (typeof userHandle === 'number' && Number.isFinite(userHandle)) {
        uniqueHandles.add(userHandle);
      }
    }

    for (const userHandle of uniqueHandles) {
      const listeners = this.subscribers.get(userHandle);

      if (!listeners || listeners.size === 0) {
        continue;
      }

      for (const listener of listeners) {
        listener();
      }
    }
  }

  private getOrCreateSubscribers(userHandle: number): Set<OpenTaskSubscriber> {
    const existingSubscribers = this.subscribers.get(userHandle);
    if (existingSubscribers) {
      return existingSubscribers;
    }

    const nextSubscribers = new Set<OpenTaskSubscriber>();
    this.subscribers.set(userHandle, nextSubscribers);
    return nextSubscribers;
  }
}
