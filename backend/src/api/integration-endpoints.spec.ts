/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';

jest.mock('./ai/ai.service', () => ({ AiService: class {} }));
jest.mock('./document/document.service', () => ({ DocumentService: class {} }));
jest.mock('./mail/mail.service', () => ({ MailService: class {} }));
jest.mock('./script/script.service', () => ({
  ScriptService: class {},
  ScriptMethods: {
    beforeRead: 0,
    afterRead: 1,
    beforeUpdate: 2,
    afterUpdate: 3,
    beforeInsert: 4,
    afterInsert: 5,
    beforeDelete: 6,
    afterDelete: 7,
  },
}));
jest.mock('./webhook/webhook.service', () => ({ WebhookService: class {} }));
jest.mock('../calendar/azure/azure.calendar.service', () => ({
  AzureCalendarService: class {},
}));
jest.mock('../calendar/google/google.calendar.service', () => ({
  GoogleCalendarService: class {},
}));
jest.mock('../entity/DocumentItem', () => ({ DocumentItem: class {} }));
jest.mock('../entity/EmailDeliveryItem', () => ({
  EmailDeliveryItem: class {},
}));
jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/EventItem', () => ({ EventItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/global/entity.registry', () => ({
  ENTITY_HANDLES: ['ticket'],
  ENTITY_REGISTRY: [],
}));

import { AiController } from './ai/ai.controller';
import { DocumentController } from './document/document.controller';
import { MailController } from './mail/mail.controller';
import { ScriptController } from './script/script.controller';
import { ScriptMethods } from './script/script.service';
import { WebhookController } from './webhook/webhook.controller';
import { AzureCalendarController } from '../calendar/azure/azure.calendar.controller';
import { GoogleCalendarController } from '../calendar/google/google.calendar.controller';
import type { PersonItem } from '../entity/PersonItem';

type AuthenticatedRequest = Request & { user: PersonItem };

const createMockUser = (withSession: boolean = true): PersonItem =>
  ({
    handle: 1,
    username: 'tester',
    ...(withSession ? { session: { provider: 'test' } } : {}),
  }) as unknown as PersonItem;

const createMockRequest = (user: PersonItem = createMockUser()): AuthenticatedRequest =>
  ({ user }) as unknown as AuthenticatedRequest;

const createMockResponse = (): Response =>
  ({
    setHeader: jest.fn(),
    sendFile: jest.fn(),
  }) as unknown as Response;

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('ScriptController', () => {
  it('runs a client-side script', async () => {
    const result = { ok: true };
    const scriptService = {
      runClient: jest.fn(async () => result),
      runServer: jest.fn(),
    };
    const controller = new ScriptController(scriptService as never);
    const req = createMockRequest();
    const body = {
      items: [{ handle: 1 }],
      entity: { handle: 'ticket' },
      name: 'openDialog',
      parameter: { foo: 'bar' },
    };

    await expect(controller.runClient(req as never, body as never)).resolves.toBe(result);
    expect(asMock(scriptService.runClient)).toHaveBeenCalledWith(
      body.items,
      body.entity,
      req.user,
      body.name,
      body.parameter,
    );
  });

  it('rejects client-side script requests with missing parameters', async () => {
    const controller = new ScriptController({} as never);
    const req = createMockRequest();

    await expect(
      controller.runClient(req as never, {
        items: null,
        entity: { handle: 'ticket' },
        name: 'openDialog',
      } as never),
    ).rejects.toThrow(
      new BadRequestException('script.scriptMissingParameters'),
    );
  });

  it('runs a server-side script', async () => {
    const result = { ok: true };
    const scriptService = {
      runClient: jest.fn(),
      runServer: jest.fn(async () => result),
    };
    const controller = new ScriptController(scriptService as never);
    const req = createMockRequest();
    const body = {
      method: 'beforeRead' as keyof typeof ScriptMethods,
      items: [{ handle: 1 }],
      entity: { handle: 'ticket' },
    };

    await expect(controller.runServer(req as never, body as never)).resolves.toBe(result);
    expect(asMock(scriptService.runServer)).toHaveBeenCalledWith(
      ScriptMethods.beforeRead,
      body.items,
      body.entity,
      req.user,
    );
  });

  it('rejects server-side script requests with invalid methods', async () => {
    const controller = new ScriptController({} as never);
    const req = createMockRequest();

    await expect(
      controller.runServer(req as never, {
        method: 'notExisting',
        items: [{ handle: 1 }],
        entity: { handle: 'ticket' },
      } as never),
    ).rejects.toThrow(new BadRequestException('script.invalidMethod'));
  });
});

describe('MailController', () => {
  it('renders an email preview', async () => {
    const preview = { subject: 'Hello', html: '<p>Hello</p>' };
    const mailService = {
      previewEmail: jest.fn(async () => preview),
      sendEmail: jest.fn(),
    };
    const controller = new MailController(mailService as never);
    const req = createMockRequest();
    const payload = {
      entityHandle: 'ticket',
      entityId: 1,
      mailTemplateHandle: 2,
    };

    await expect(
      controller.preview(req as never, payload as never),
    ).resolves.toBe(preview);
    expect(asMock(mailService.previewEmail)).toHaveBeenCalledWith(
      payload,
      req.user,
    );
  });

  it('queues or sends an email', async () => {
    const delivery = { handle: 9 };
    const mailService = {
      previewEmail: jest.fn(),
      sendEmail: jest.fn(async () => delivery),
    };
    const controller = new MailController(mailService as never);
    const req = createMockRequest();
    const payload = {
      entityHandle: 'ticket',
      entityId: 1,
      mailTemplateHandle: 2,
    };

    await expect(controller.send(req as never, payload as never)).resolves.toBe(
      delivery,
    );
    expect(asMock(mailService.sendEmail)).toHaveBeenCalledWith(payload, req.user);
  });
});

describe('WebhookController', () => {
  it('queues webhook deliveries', async () => {
    const webhookService = {
      querySubscription: jest.fn(async () => ({ handle: 12 })),
      retryDelivery: jest.fn(),
    };
    const controller = new WebhookController(webhookService as never);

    await expect(
      controller.triggerWebhook(5, { payload: { handle: 1 } }),
    ).resolves.toEqual({
      message: 'Webhook delivery queued',
      deliveryId: 12,
    });
    expect(asMock(webhookService.querySubscription)).toHaveBeenCalledWith(5, {
      handle: 1,
    });
  });

  it('queues webhook delivery retries', async () => {
    const webhookService = {
      querySubscription: jest.fn(),
      retryDelivery: jest.fn(async () => ({ handle: 12, attemptCount: 3 })),
    };
    const controller = new WebhookController(webhookService as never);

    await expect(controller.retryDelivery(12)).resolves.toEqual({
      message: 'Webhook retry queued',
      deliveryId: 12,
      attempt: 3,
    });
    expect(asMock(webhookService.retryDelivery)).toHaveBeenCalledWith(12);
  });
});

describe('DocumentController', () => {
  it('uploads documents', async () => {
    const uploaded = { handle: 1 };
    const documentService = {
      uploadDocument: jest.fn(async () => uploaded),
      downloadDocument: jest.fn(),
    };
    const controller = new DocumentController(documentService as never);
    const req = createMockRequest();
    const file = { originalname: 'invoice.pdf' } as Express.Multer.File;

    await expect(
      controller.upload(
        'ticket',
        '1',
        req as never,
        file,
        'document',
        'Invoice',
      ),
    ).resolves.toBe(uploaded);
    expect(asMock(documentService.uploadDocument)).toHaveBeenCalledWith(
      file,
      'ticket',
      '1',
      'document',
      req.user,
      'Invoice',
    );
  });

  it('downloads documents', async () => {
    const documentService = {
      uploadDocument: jest.fn(),
      downloadDocument: jest.fn(async () => ({
        filePath: '/tmp/document.pdf',
        document: { mimetype: 'application/pdf', filename: 'document.pdf' },
      })),
    };
    const controller = new DocumentController(documentService as never);
    const req = createMockRequest();
    const res = createMockResponse();

    await controller.download(1, res, req as never);

    expect(asMock(documentService.downloadDocument)).toHaveBeenCalledWith(
      1,
      req.user,
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-Type',
      'application/pdf',
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-Disposition',
      'attachment; filename="document.pdf"',
    );
    expect(res.sendFile).toHaveBeenCalledWith('/tmp/document.pdf');
  });

  it('previews PDF documents inline', async () => {
    const documentService = {
      uploadDocument: jest.fn(),
      downloadDocument: jest.fn(async () => ({
        filePath: '/tmp/document.pdf',
        document: { mimetype: 'application/pdf', filename: 'document.pdf' },
      })),
    };
    const controller = new DocumentController(documentService as never);
    const req = createMockRequest();
    const res = createMockResponse();

    await controller.preview(1, res, req as never);

    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-Type',
      'application/pdf',
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-Disposition',
      'inline; filename="document.pdf"',
    );
    expect(res.sendFile).toHaveBeenCalledWith('/tmp/document.pdf');
  });

  it('previews non-PDF documents as attachments', async () => {
    const documentService = {
      uploadDocument: jest.fn(),
      downloadDocument: jest.fn(async () => ({
        filePath: '/tmp/document.txt',
        document: { mimetype: 'text/plain', filename: 'document.txt' },
      })),
    };
    const controller = new DocumentController(documentService as never);
    const req = createMockRequest();
    const res = createMockResponse();

    await controller.preview(1, res, req as never);

    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-Type',
      'text/plain',
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-Disposition',
      'attachment; filename="document.txt"',
    );
    expect(res.sendFile).toHaveBeenCalledWith('/tmp/document.txt');
  });
});

describe('GoogleCalendarController', () => {
  it('queues Google calendar events', async () => {
    const googleCalendarService = {
      queueEvent: jest.fn(async () => ({ handle: 7 })),
    };
    const controller = new GoogleCalendarController(
      googleCalendarService as never,
    );
    const req = createMockRequest();
    const event = { handle: 1 };

    await expect(
      controller.triggerEvent(req as never, event as never),
    ).resolves.toEqual({
      message: 'Google calendar event queued',
      jobId: 7,
    });
    expect(asMock(googleCalendarService.queueEvent)).toHaveBeenCalledWith(
      event,
      req.user.session,
    );
  });

  it('rejects Google calendar events without a user session', async () => {
    const controller = new GoogleCalendarController({} as never);
    const req = createMockRequest(createMockUser(false));

    await expect(
      controller.triggerEvent(req as never, { handle: 1 } as never),
    ).rejects.toThrow('global.authenticationFailed');
  });
});

describe('AzureCalendarController', () => {
  it('queues Azure calendar events', async () => {
    const azureCalendarService = {
      queueEvent: jest.fn(async () => ({ handle: 11 })),
    };
    const controller = new AzureCalendarController(
      azureCalendarService as never,
    );
    const req = createMockRequest();
    const event = { handle: 1 };

    await expect(
      controller.triggerEvent(req as never, event as never),
    ).resolves.toEqual({
      message: 'Azure calendar event queued',
      jobId: 11,
    });
    expect(asMock(azureCalendarService.queueEvent)).toHaveBeenCalledWith(
      event,
      req.user.session,
    );
  });

  it('rejects Azure calendar events without a user session', async () => {
    const controller = new AzureCalendarController({} as never);
    const req = createMockRequest(createMockUser(false));

    await expect(
      controller.triggerEvent(req as never, { handle: 1 } as never),
    ).rejects.toThrow('global.authenticationFailed');
  });
});
