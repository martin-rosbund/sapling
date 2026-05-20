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

const graphApiGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const graphApiSelect = jest.fn(() => ({ get: graphApiGet }));
const graphApi = jest.fn(() => ({ select: graphApiSelect }));
const graphInit = jest.fn(() => ({ api: graphApi }));

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: graphInit,
  },
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MailService } from './mail.service';

type MailDeliveryTestDouble = {
  handle?: number;
  provider: string;
  attachmentHandles?: number[];
  requestPayload?: {
    from?: string;
    senderSource?: string;
  };
  createdBy: {
    type?: {
      handle: string;
    };
    session: {
      accessToken: string;
      refreshToken: string;
    };
  };
  responseStatusCode?: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  status?: {
    handle: string;
  };
  completedAt?: Date;
};

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
    buildContext: jest
      .fn<(...args: unknown[]) => Promise<Record<string, unknown>>>()
      .mockResolvedValue(context),
    replaceRecipients: jest
      .fn<(input: string[] | string | undefined) => string[]>()
      .mockImplementation((input: string[] | string | undefined) => {
        if (!input) {
          return [];
        }

        return Array.isArray(input) ? input : input.split(/[;,]/);
      }),
    replacePlaceholders: jest
      .fn<
        (template: string, templateContext: Record<string, unknown>) => string
      >()
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

  it('does not expose azure aliases and alternate mails as sender options', async () => {
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
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValueOnce({
          handle: 1,
          firstName: 'Martin',
          lastName: 'Rosbund',
          email: 'fallback@example.com',
          type: { handle: 'azure' },
          sharedMailboxGroups: [],
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
      'fallback@example.com',
    ]);
  });

  it('includes configured shared mailboxes assigned to the current person', async () => {
    graphApiGet.mockResolvedValue({
      displayName: 'ISB - Martin Rosbund',
      mail: 'martin.rosbund@example.com',
      otherMails: [],
      proxyAddresses: [],
    });

    const em = {
      findOne: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValueOnce({
          handle: 1,
          firstName: 'Martin',
          lastName: 'Rosbund',
          email: 'fallback@example.com',
          type: { handle: 'azure' },
          sharedMailboxGroups: [
            {
              isActive: true,
              items: [
                {
                  title: 'Support',
                  email: 'support@example.com',
                  provider: { handle: 'azure' },
                  isActive: true,
                },
                {
                  title: 'Legacy',
                  email: 'legacy@example.com',
                  provider: { handle: 'google' },
                  isActive: true,
                },
              ],
            },
            {
              isActive: false,
              items: [
                {
                  title: 'Inactive',
                  email: 'inactive@example.com',
                  provider: { handle: 'azure' },
                  isActive: true,
                },
              ],
            },
          ],
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

    expect(result.senders.map((sender) => sender.email)).toContain(
      'support@example.com',
    );
    expect(result.senders.map((sender) => sender.email)).not.toContain(
      'legacy@example.com',
    );
    expect(result.senders.map((sender) => sender.email)).not.toContain(
      'inactive@example.com',
    );
  });

  it('rejects azure aliases that are not configured shared mailboxes', async () => {
    graphApiGet.mockResolvedValue({
      displayName: 'ISB - Martin Rosbund',
      mail: 'martin.rosbund@example.com',
      otherMails: ['service@example.com'],
      proxyAddresses: [
        'SMTP:martin.rosbund@example.com',
        'smtp:team@example.com',
      ],
    });

    const em = {
      findOne: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          handle: 1,
          firstName: 'Martin',
          lastName: 'Rosbund',
          email: 'fallback@example.com',
          type: { handle: 'azure' },
          sharedMailboxGroups: [],
          session: {
            accessToken: 'token',
            refreshToken: 'refresh',
          },
        }),
    };

    const service = new MailService(
      em as never,
      { getEntityTemplate: jest.fn(() => []) } as never,
      createMessageTemplateServiceMock() as never,
      { add: jest.fn() } as never,
    );

    await expect(
      (
        service as never as {
          resolveRequestedSender: (
            user: unknown,
            sender: string,
          ) => Promise<unknown>;
        }
      ).resolveRequestedSender({ handle: 1 }, 'team@example.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists provider diagnostics when dispatch fails', async () => {
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue();
    const delivery: MailDeliveryTestDouble = {
      handle: 15,
      provider: 'azure',
      attachmentHandles: [],
      requestPayload: {
        from: 'support@example.com',
        senderSource: 'configured',
      },
      createdBy: {
        type: { handle: 'azure' },
        session: {
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      },
    };
    const fork = {
      findOne: jest.fn<() => Promise<unknown>>().mockResolvedValue(delivery),
      flush,
    };
    const em = {
      fork: jest.fn(() => fork),
    };

    const service = new MailService(
      em as never,
      { getEntityTemplate: jest.fn(() => []) } as never,
      createMessageTemplateServiceMock() as never,
      { add: jest.fn() } as never,
    );

    const providerError = {
      statusCode: 403,
      body: {
        error: {
          code: 'ErrorSendAsDenied',
        },
      },
      headers: {
        'request-id': 'req-123',
      },
      message: 'Send as denied',
    };

    (service as never as { loadAttachments: jest.Mock }).loadAttachments = jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValue([]);
    (service as never as { sendWithProvider: jest.Mock }).sendWithProvider =
      jest.fn<() => Promise<unknown>>().mockRejectedValue(providerError);
    const ensureStatus =
      jest.fn<(...args: any[]) => Promise<{ handle: string }>>();
    ensureStatus.mockImplementation((_targetEm: unknown, handle: string) =>
      Promise.resolve({ handle }),
    );
    (service as never as { ensureStatus: jest.Mock }).ensureStatus =
      ensureStatus;

    await expect(service.dispatchDelivery(15)).rejects.toEqual(providerError);

    expect(delivery.responseStatusCode).toBe(403);
    expect(delivery.responseBody).toEqual({
      message: 'Send as denied',
      senderEmail: 'support@example.com',
      senderSource: 'configured',
      providerError: {
        error: {
          code: 'ErrorSendAsDenied',
        },
      },
    });
    expect(delivery.responseHeaders).toEqual({
      'request-id': 'req-123',
    });
    expect(delivery.status).toEqual({ handle: 'failed' });
    expect(delivery.completedAt).toBeInstanceOf(Date);
    expect(flush).toHaveBeenCalled();
  });

  it('retries mail delivery only after authentication failures', async () => {
    const service = new MailService(
      {} as never,
      { getEntityTemplate: jest.fn(() => []) } as never,
      createMessageTemplateServiceMock() as never,
      { add: jest.fn() } as never,
    );

    const delivery: MailDeliveryTestDouble = {
      provider: 'azure',
      createdBy: {
        session: {
          accessToken: 'stale-token',
          refreshToken: 'refresh-token',
        },
      },
    };
    const authError = {
      statusCode: 401,
      body: {
        error: {
          code: 'InvalidAuthenticationToken',
        },
      },
      message: 'Expired token',
    };
    const sendWithProviderAccessToken =
      jest.fn<(...args: any[]) => Promise<unknown>>();
    sendWithProviderAccessToken
      .mockRejectedValueOnce(authError)
      .mockResolvedValueOnce({ responseStatusCode: 202 });
    const refreshProviderAccessToken =
      jest.fn<(...args: any[]) => Promise<string | null>>();
    refreshProviderAccessToken.mockResolvedValue('fresh-token');

    (
      service as never as {
        sendWithProviderAccessToken: typeof sendWithProviderAccessToken;
        refreshProviderAccessToken: typeof refreshProviderAccessToken;
      }
    ).sendWithProviderAccessToken = sendWithProviderAccessToken;
    (
      service as never as {
        refreshProviderAccessToken: typeof refreshProviderAccessToken;
      }
    ).refreshProviderAccessToken = refreshProviderAccessToken;

    const result = await (
      service as never as {
        sendWithProvider: (
          delivery: unknown,
          attachments: unknown[],
          em: unknown,
        ) => Promise<unknown>;
      }
    ).sendWithProvider(delivery, [], {});

    expect(refreshProviderAccessToken).toHaveBeenCalledTimes(1);
    expect(sendWithProviderAccessToken).toHaveBeenNthCalledWith(
      1,
      'azure',
      delivery,
      delivery.createdBy.session,
      'stale-token',
      [],
      undefined,
    );
    expect(sendWithProviderAccessToken).toHaveBeenNthCalledWith(
      2,
      'azure',
      delivery,
      delivery.createdBy.session,
      'fresh-token',
      [],
      undefined,
    );
    expect(result).toEqual({ responseStatusCode: 202 });
  });

  it('does not retry mail delivery for non-authentication provider failures', async () => {
    const service = new MailService(
      {} as never,
      { getEntityTemplate: jest.fn(() => []) } as never,
      createMessageTemplateServiceMock() as never,
      { add: jest.fn() } as never,
    );

    const delivery: MailDeliveryTestDouble = {
      provider: 'azure',
      createdBy: {
        session: {
          accessToken: 'stale-token',
          refreshToken: 'refresh-token',
        },
      },
    };
    const providerError = {
      statusCode: 504,
      body: {
        error: {
          code: 'GatewayTimeout',
        },
      },
      message: 'Gateway timeout',
    };
    const sendWithProviderAccessToken =
      jest.fn<(...args: any[]) => Promise<never>>();
    sendWithProviderAccessToken.mockRejectedValue(providerError);
    const refreshProviderAccessToken =
      jest.fn<(...args: any[]) => Promise<string | null>>();
    refreshProviderAccessToken.mockResolvedValue('fresh-token');

    (
      service as never as {
        sendWithProviderAccessToken: typeof sendWithProviderAccessToken;
        refreshProviderAccessToken: typeof refreshProviderAccessToken;
      }
    ).sendWithProviderAccessToken = sendWithProviderAccessToken;
    (
      service as never as {
        refreshProviderAccessToken: typeof refreshProviderAccessToken;
      }
    ).refreshProviderAccessToken = refreshProviderAccessToken;

    await expect(
      (
        service as never as {
          sendWithProvider: (
            delivery: unknown,
            attachments: unknown[],
            em: unknown,
          ) => Promise<unknown>;
        }
      ).sendWithProvider(delivery, [], {}),
    ).rejects.toEqual(providerError);

    expect(refreshProviderAccessToken).not.toHaveBeenCalled();
    expect(sendWithProviderAccessToken).toHaveBeenCalledTimes(1);
  });
});
