import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

jest.mock('../entity/EMailListItem', () => ({ EMailListItem: class {} }));
jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { EmailListController } from './EmailListController';
import type { EMailListItem } from '../entity/EMailListItem';
import type { PersonItem } from '../entity/PersonItem';

describe('EmailListController', () => {
  beforeEach(() => {
    global.log = {
      debug: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('binds logger methods to the logger instance', async () => {
    const logger = {
      entries: [] as string[],
      debug(this: { entries: string[] }, value: string) {
        this.entries.push(`debug:${value}`);
      },
      trace(this: { entries: string[] }, value: string) {
        this.entries.push(`trace:${value}`);
      },
    };
    global.log = logger as unknown as typeof global.log;

    const controller = new EmailListController(
      { handle: 'emailList' } as never,
      { handle: 11 } as never,
    );

    await controller.execute([], 'unsupportedAction');

    expect(logger.entries).toHaveLength(2);
    expect(logger.entries[0]).toContain('debug:scriptController - emailList');
    expect(logger.entries[1]).toContain('trace:scriptController - emailList');
  });

  it('sends one email per mail list with deduplicated recipients', async () => {
    const loadedMailList = {
      handle: 4,
      mailTemplate: { handle: 8 },
      companies: [{ email: 'team@example.com' }, { email: 'TEAM@example.com' }],
      persons: [{ email: 'person@example.com' }, { email: '' }],
    } as unknown as EMailListItem;
    const em = {
      findOne: jest.fn().mockResolvedValue(loadedMailList),
    };
    const mailService = {
      sendEmail: jest.fn().mockResolvedValue({ handle: 99 }),
    };
    const controller = new EmailListController(
      { handle: 'emailList' } as never,
      { handle: 11 } as never,
      em as never,
    );
    controller.mailService = mailService as never;

    const result = await controller.execute(
      [{ handle: 4 }] as object[],
      'sendMail',
    );

    expect(mailService.sendEmail).toHaveBeenCalledWith(
      {
        entityHandle: 'emailList',
        itemHandle: 4,
        templateHandle: 8,
        subject: undefined,
        bodyMarkdown: undefined,
        to: ['team@example.com', 'person@example.com'],
      },
      { handle: 11 },
    );
    expect(result.isSuccess).toBe(true);
  });

  it('rejects mail lists without recipients', async () => {
    const loadedMailList = {
      handle: 4,
      mailTemplate: { handle: 8 },
      companies: [],
      persons: [],
    } as unknown as EMailListItem;
    const em = {
      findOne: jest.fn().mockResolvedValue(loadedMailList),
    };
    const controller = new EmailListController(
      { handle: 'emailList' } as never,
      { handle: 11 } as PersonItem,
      em as never,
    );
    controller.mailService = {
      sendEmail: jest.fn(),
    } as never;

    await expect(
      controller.execute([{ handle: 4 }] as object[], 'sendMail'),
    ).rejects.toThrow(
      new BadRequestException('global.scriptEmailRecipientsRequired'),
    );
  });

  it('rejects mail lists without template or inline content', async () => {
    const loadedMailList = {
      handle: 4,
      companies: [{ email: 'team@example.com' }],
      persons: [],
    } as unknown as EMailListItem;
    const em = {
      findOne: jest.fn().mockResolvedValue(loadedMailList),
    };
    const controller = new EmailListController(
      { handle: 'emailList' } as never,
      { handle: 11 } as PersonItem,
      em as never,
    );
    controller.mailService = {
      sendEmail: jest.fn(),
    } as never;

    await expect(
      controller.execute([{ handle: 4 }] as object[], 'sendMail'),
    ).rejects.toThrow(
      new BadRequestException('global.scriptEmailTemplateRequired'),
    );
  });
});
