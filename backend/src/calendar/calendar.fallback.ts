import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { parseRecurrenceRule } from './calendar.recurrence';

/**
 * Builds a calendar fallback payload (ICS file + e-mail draft data) for an
 * `EventDeliveryItem` that could not be synchronized with the actual
 * calendar provider.
 *
 * The fallback is persisted on the failed `EventDeliveryItem.responseBody`
 * and can be consumed by downstream tooling to manually send out the event.
 */

function padCalendarValue(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Formats a JS `Date` as an iCalendar UTC date-time value (YYYYMMDDTHHMMSSZ).
 */
export function formatUtcDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}` +
    `${padCalendarValue(date.getUTCMonth() + 1)}` +
    `${padCalendarValue(date.getUTCDate())}` +
    `T${padCalendarValue(date.getUTCHours())}` +
    `${padCalendarValue(date.getUTCMinutes())}` +
    `${padCalendarValue(date.getUTCSeconds())}Z`
  );
}

/**
 * Escapes a free-text value for inclusion in an iCalendar property.
 */
export function escapeICalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

type ParticipantAddress = {
  email: string;
  name: string;
};

function collectParticipants(
  delivery: EventDeliveryItem,
): ParticipantAddress[] {
  return (delivery.event.participants ?? [])
    .map((participant) => ({
      email: participant.email?.trim() ?? '',
      name: `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim(),
    }))
    .filter((participant) => participant.email.length > 0);
}

/**
 * Builds the raw ICS (iCalendar) document for a failed calendar delivery.
 */
export function buildIcsDocument(
  delivery: EventDeliveryItem,
  reason: string,
  participants: ParticipantAddress[],
): string {
  const event = delivery.event;
  const parsedRecurrenceRule = parseRecurrenceRule(event.recurrenceRule);
  const creatorEmail = event.creatorPerson?.email?.trim() ?? '';
  const organizerName =
    `${event.creatorPerson?.firstName ?? ''} ${event.creatorPerson?.lastName ?? ''}`.trim() ||
    'Sapling';
  const description = event.description?.trim() ?? '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sapling//Calendar Fallback//EN',
    'BEGIN:VEVENT',
    `UID:sapling-event-${event.handle ?? 'unknown'}-delivery-${delivery.handle ?? 'unknown'}`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatUtcDate(event.startDate)}`,
    `DTEND:${formatUtcDate(event.endDate)}`,
    parsedRecurrenceRule ? `RRULE:${parsedRecurrenceRule.raw}` : '',
    `SUMMARY:${escapeICalendarText(event.title ?? 'Sapling event')}`,
    `DESCRIPTION:${escapeICalendarText(description || reason)}`,
    creatorEmail
      ? `ORGANIZER;CN=${escapeICalendarText(organizerName)}:MAILTO:${creatorEmail}`
      : '',
    ...participants.map(
      (participant) =>
        `ATTENDEE;CN=${escapeICalendarText(participant.name || participant.email)}:MAILTO:${participant.email}`,
    ),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/**
 * Builds an e-mail draft payload for a failed calendar delivery.
 *
 * NOTE: Strings are currently kept in German (matching the legacy behaviour
 * before the refactor). When the e-mail fallback is wired into a renderer
 * with i18n support these should be translated via the translation pipeline.
 */
export function buildEmailFallback(
  delivery: EventDeliveryItem,
  reason: string,
  participants: ParticipantAddress[],
  icsContent: string,
): object {
  const event = delivery.event;
  const description = event.description?.trim() ?? '';
  const creatorEmail = event.creatorPerson?.email?.trim() ?? '';
  const recipients = [
    ...new Set(participants.map((participant) => participant.email)),
  ];

  return {
    strategy: 'email-draft',
    reason,
    subject: `Kalendereintrag fallback: ${event.title ?? 'Termin'}`,
    to: recipients,
    from: creatorEmail || undefined,
    bodyText: [
      `Der Kalendereintrag "${event.title ?? 'Termin'}" konnte nicht automatisch synchronisiert werden.`,
      reason,
      '',
      `Beginn: ${event.startDate.toISOString()}`,
      `Ende: ${event.endDate.toISOString()}`,
      description ? `Beschreibung: ${description}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    icsFilename: `sapling-event-${event.handle ?? 'unknown'}.ics`,
    icsContent,
  };
}

/**
 * Builds the complete calendar fallback object to be persisted on
 * `EventDeliveryItem.responseBody.fallback`.
 */
export function buildCalendarFallback(
  delivery: EventDeliveryItem,
  reason: string,
): { fallback: object } {
  const participants = collectParticipants(delivery);
  const icsContent = buildIcsDocument(delivery, reason, participants);
  return {
    fallback: buildEmailFallback(delivery, reason, participants, icsContent),
  };
}
