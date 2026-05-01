import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../entity/global/entity.registry', () => ({ ENTITY_MAP: {} }));
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

  it('renders markdown and strips it back to readable text', () => {
    const html = service.renderMarkdown('**Hello**\n\n- World');
    const text = service.stripMarkdown('**Hello**\n\n- World');

    expect(html).toContain('<strong>Hello</strong>');
    expect(html).toContain('<ul><li>World</li></ul>');
    expect(text).toContain('Hello');
    expect(text).toContain('- World');
  });
});
