import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({
  EntityManager: class EntityManager {},
  Type: class Type {},
}));

jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_MAP: {
    ticket: class TicketEntity {},
  },
}));

jest.mock('../../entity/EmailTemplateItem', () => ({
  EmailTemplateItem: class EmailTemplateItem {},
}));

jest.mock('../../entity/PersonItem', () => ({
  PersonItem: class PersonItem {},
}));

jest.mock('../../entity/EmailDeliveryItem', () => ({
  EmailDeliveryItem: class EmailDeliveryItem {},
}));

jest.mock('../../entity/EmailDeliveryStatusItem', () => ({
  EmailDeliveryStatusItem: class EmailDeliveryStatusItem {},
}));

jest.mock('../../entity/EntityItem', () => ({
  EntityItem: class EntityItem {},
}));

jest.mock('../../entity/DocumentItem', () => ({
  DocumentItem: class DocumentItem {},
}));

jest.mock('../../entity/PersonSessionItem', () => ({
  PersonSessionItem: class PersonSessionItem {},
}));

const graphApiGet = jest.fn();
const graphApiSelect = jest.fn(() => ({ get: graphApiGet }));
const graphApi = jest.fn(() => ({ select: graphApiSelect }));
const graphInit = jest.fn(() => ({ api: graphApi }));

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: graphInit,
  },
}));

import { NotFoundException } from '@nestjs/common';
import { MailService } from './mail.service';

function getValue(
  context: Record<string, unknown>,
  expression: string,
): unknown {
  return expression
    .split('.')
    .reduce<unknown>(
      (current, key) =>
        typeof current === 'object' && current !== null
          ? (current as Record<string, unknown>)[key]
          : undefined,
      context,
    );
}

function createMessageTemplateServiceMock(
  context: Record<string, unknown> = {},
) {
  return {
    buildContext: jest.fn().mockResolvedValue(context),
    replaceRecipients: jest
      .fn()
      .mockImplementation((input: string[] | string | undefined) => {
        if (!input) {
          return [];
        }

        return Array.isArray(input) ? input : input.split(/[;,]/);
      }),
    replacePlaceholders: jest
      .fn()
      .mockImplementation(
        (template: string, templateContext: Record<string, unknown>) =>
          template.replace(
            /\{\{\s*([^}]+?)\s*\}\}/g,
            (_match, expression: string) => {
              const value = getValue(templateContext, expression.trim());

              return typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
                ? String(value)
                : '';
            },
          ),
      ),
    stripMarkdown: jest.fn((markdown: string) => markdown),
  };
}

describe('MailService', () => {
  it('renders rich markdown in previewEmail', async () => {
    const em = {
      findOne: jest.fn(
        (_entityClass: unknown, query: { handle: string | number }) =>
          query.handle === 'ticket' ? { handle: 'ticket' } : null,
      ),
    };

    const templateService = {
      getEntityTemplate: jest.fn(() => []),
    };
    const messageTemplateService = createMessageTemplateServiceMock({
      handle: 42,
      title: 'Launch Plan',
      owner: { name: 'Ada' },
    });

    const service = new MailService(
      em as never,
      templateService as never,
      messageTemplateService as never,
      { add: jest.fn() } as never,
    );

    const preview = await service.previewEmail(
      {
        entityHandle: 'ticket',
        itemHandle: 42,
        to: ['team@example.com'],
        subject: 'Update {{ title }}',
        bodyMarkdown: [
          '# {{ title }}',
          '',
          '- [x] Ready',
          '- [ ] Pending',
          '',
          '| Name | Owner |',
          '| --- | --- |',
          '| Demo | {{ owner.name }} |',
          '',
          '```ts',
          'const ready = true;',
          '```',
          '',
          '[Open](https://example.com)',
        ].join('\n'),
      },
      { handle: 1 } as never,
    );

    expect(preview.subject).toBe('Update Launch Plan');
    expect(preview.bodyHtml).toContain('<h1>Launch Plan</h1>');
    expect(preview.bodyHtml).toContain('type="checkbox"');
    expect(preview.bodyHtml).toContain('<table>');
    expect(preview.bodyHtml).toContain(
      '<code class="language-ts">const ready = true;',
    );
    expect(preview.bodyHtml).toContain('href="https://example.com"');
    expect(preview.bodyHtml).toContain('target="_blank"');
    expect(preview.bodyHtml).toContain('noopener noreferrer');
  });

  it('throws when the entity does not exist', async () => {
    const service = new MailService(
      {
        findOne: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      } as never,
      {
        getEntityTemplate: jest.fn(() => []),
      } as never,
      createMessageTemplateServiceMock() as never,
      { add: jest.fn() } as never,
    );

    await expect(
      service.previewEmail(
        {
          entityHandle: 'missing',
          to: ['team@example.com'],
        },
        { handle: 1 } as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('filters technical azure proxy addresses from sender options', async () => {
    graphApiGet.mockResolvedValue({
      displayName: 'ISB - Martin Rosbund',
      mail: 'martin.rosbund@example.com',
      otherMails: ['service@example.com'],
      proxyAddresses: [
        'SMTP:martin.rosbund@example.com',
        'smtp:team@example.com',
        'X500:/o=ISB Bonn GmbH/ou=Exchange Administrative Group/cn=Recipients/cn=user',
        'SIP:martin.rosbund@example.com',
      ],
    });

    const em = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          handle: 1,
          firstName: 'Martin',
          lastName: 'Rosbund',
          email: 'fallback@example.com',
          type: { handle: 'azure' },
          session: {
            accessToken: 'token',
            refreshToken: 'refresh',
          },
        })
        .mockResolvedValue(undefined),
    };

    const service = new MailService(
      em as never,
      { getEntityTemplate: jest.fn(() => []) } as never,
      createMessageTemplateServiceMock() as never,
      { add: jest.fn() } as never,
    );

    const result = await service.listSenderOptions({ handle: 1 } as never);

    expect(result.provider).toBe('azure');
    expect(result.senders.map((sender) => sender.email)).toEqual([
      'martin.rosbund@example.com',
      'service@example.com',
      'team@example.com',
      'fallback@example.com',
    ]);
  });
});
