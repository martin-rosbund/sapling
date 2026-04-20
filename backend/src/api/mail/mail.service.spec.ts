import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({
  EntityManager: class EntityManager {},
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

import { NotFoundException } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('renders rich markdown in previewEmail', async () => {
    const em = {
      findOne: jest.fn(
        (_entityClass: unknown, query: { handle: string | number }) => {
          if (query.handle === 'ticket') {
            return { handle: 'ticket' };
          }

          if (query.handle === 42) {
            return {
              handle: 42,
              title: 'Launch Plan',
              owner: { name: 'Ada' },
            };
          }

          return null;
        },
      ),
    };

    const templateService = {
      getEntityTemplate: jest.fn(() => []),
    };

    const service = new MailService(
      em as never,
      templateService as never,
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
        findOne: jest.fn().mockResolvedValue(null),
      } as never,
      {
        getEntityTemplate: jest.fn(() => []),
      } as never,
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
});
