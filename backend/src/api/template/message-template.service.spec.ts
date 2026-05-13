import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_MAP: {
    event: class EventItem {},
    ticket: class TicketItem {},
    person: class PersonItem {},
  },
}));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('./template.service', () => ({ TemplateService: class {} }));

import { MessageTemplateService } from './message-template.service';

describe('MessageTemplateService', () => {
  const service = new MessageTemplateService({} as never, {} as never);

  it('resolves nested placeholder paths and flattens arrays', () => {
    const result = service.replacePlaceholders(
      'Ticket {{ticket.title}} assigned to {{assignees.firstName}}',
      {
        ticket: { title: 'INC-42' },
        assignees: [{ firstName: 'Ada' }, { firstName: 'Linus' }],
      },
    );

    expect(result).toBe('Ticket INC-42 assigned to Ada, Linus');
  });

  it('unwraps entity references and collection-like values while resolving placeholders', () => {
    const result = service.replacePlaceholders(
      'Ticket {{ticket.assigneePerson.firstName}} participants {{participants.email}}',
      {
        ticket: {
          assigneePerson: {
            unwrap: () => ({
              firstName: 'Ada',
            }),
          },
        },
        participants: {
          toArray: () => [
            { email: 'ada@example.com' },
            { email: 'linus@example.com' },
          ],
        },
      },
    );

    expect(result).toBe(
      'Ticket Ada participants ada@example.com, linus@example.com',
    );
  });

  it('formats datetime placeholders with locale and time zone awareness', () => {
    const dateValue = new Date('2026-05-13T10:00:00.000Z');
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'ticket':
            return [
              {
                name: 'startDate',
                type: 'datetime',
                isReference: false,
                referenceName: '',
              },
            ];
          default:
            return [];
        }
      }),
    };
    const localService = new MessageTemplateService(
      {} as never,
      templateService as never,
    );

    const result = localService.replacePlaceholders(
      'Start {{startDate}}',
      { startDate: dateValue },
      {
        entityHandle: 'ticket',
        locale: 'de-DE',
        timeZone: 'Europe/Berlin',
      },
    );

    const expected = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Berlin',
    }).format(dateValue);

    expect(result).toBe(`Start ${expected}`);
  });

  it('supports explicit date formatters in placeholder expressions', () => {
    const localService = new MessageTemplateService({} as never, {} as never);
    const dateValue = '2026-05-13';

    const result = localService.replacePlaceholders(
      'Geburtstag {{birthDay | date}}',
      { birthDay: dateValue },
      {
        locale: 'de-DE',
        timeZone: 'Europe/Berlin',
      },
    );

    const expected = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(dateValue));

    expect(result).toBe(`Geburtstag ${expected}`);
  });

  it('renders markdown and strips it back to readable text', () => {
    const html = service.renderMarkdown('**Hello**\n\n- World');
    const text = service.stripMarkdown('**Hello**\n\n- World');

    expect(html).toContain('<strong>Hello</strong>');
    expect(html).toContain('<ul><li>World</li></ul>');
    expect(text).toContain('Hello');
    expect(text).toContain('- World');
  });

  it('adds relation paths from recipient expressions to the entity populate list', async () => {
    const findOne = jest.fn().mockResolvedValue({ handle: 7 });
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'event':
            return [
              {
                name: 'ticket',
                isReference: true,
                referenceName: 'ticket',
              },
              {
                name: 'participants',
                isReference: true,
                referenceName: 'person',
              },
            ];
          case 'ticket':
            return [
              {
                name: 'assigneePerson',
                isReference: true,
                referenceName: 'person',
              },
            ];
          default:
            return [{ name: 'handle', isReference: false, referenceName: '' }];
        }
      }),
    };
    const localService = new MessageTemplateService(
      { findOne } as never,
      templateService as never,
    );

    await localService.loadEntityContext('event', 7, [
      'ticket.assigneePerson',
      'participants',
    ]);

    expect(findOne).toHaveBeenCalledWith(
      expect.any(Function),
      { handle: 7 },
      {
        populate: ['ticket', 'participants', 'ticket.assigneePerson'],
      },
    );
  });
});
