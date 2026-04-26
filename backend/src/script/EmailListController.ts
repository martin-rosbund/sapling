import { Collection, type EntityManager } from '@mikro-orm/core';
import { BadRequestException } from '@nestjs/common';
import { EMailListItem } from '../entity/EMailListItem.js';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultClient } from './core/script.result.client.js';

type EmailListScriptParameter = {
  subject?: string;
  bodyMarkdown?: string;
  templateHandle?: number;
};

export class EmailListController extends ScriptClass {
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  async execute(
    items: object[],
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient> {
    this.logDebug('execute', 'Received client script request', {
      action: name,
      itemCount: items.length,
    });

    if (name !== 'sendMail') {
      this.logTrace('execute', 'Delegating unsupported action to base class', {
        action: name,
      });
      return super.execute(items, name, parameter);
    }

    if (!this.em || !this.mailService) {
      this.logWarn('execute', 'Missing dependencies for email list send', {
        hasEntityManager: Boolean(this.em),
        hasMailService: Boolean(this.mailService),
      });
      return new ScriptResultClient();
    }

    const options = this.normalizeParameter(parameter);
    this.logDebug('execute', 'Normalized email list parameters', {
      action: name,
      hasSubject: Boolean(options.subject?.trim()),
      hasBodyMarkdown: Boolean(options.bodyMarkdown?.trim()),
      templateHandle: options.templateHandle,
    });

    for (const item of items as EMailListItem[]) {
      this.logInfo('execute', 'Preparing email list send', {
        emailListHandle: item.handle,
      });
      const emailList = await this.loadMailList(item);
      const recipients = this.collectRecipients(emailList);

      this.logDebug('execute', 'Collected recipients for email list', {
        emailListHandle: emailList.handle,
        recipientCount: recipients.length,
        recipients,
      });

      if (recipients.length === 0) {
        this.logWarn('execute', 'No recipients found for email list', {
          emailListHandle: emailList.handle,
        });
        throw new BadRequestException('global.scriptEmailRecipientsRequired');
      }

      const templateHandle =
        options.templateHandle ?? emailList.mailTemplate?.handle;
      const subject = options.subject?.trim();
      const bodyMarkdown = options.bodyMarkdown?.trim();

      this.logTrace('execute', 'Resolved email content source', {
        emailListHandle: emailList.handle,
        templateHandle,
        hasSubject: Boolean(subject),
        hasBodyMarkdown: Boolean(bodyMarkdown),
        mailTemplateHandle: emailList.mailTemplate?.handle,
      });

      if (!templateHandle && !subject && !bodyMarkdown) {
        this.logWarn(
          'execute',
          'Missing template and inline content for email list send',
          {
            emailListHandle: emailList.handle,
          },
        );
        throw new BadRequestException('global.scriptEmailTemplateRequired');
      }

      this.logInfo('execute', 'Dispatching email list delivery', {
        emailListHandle: emailList.handle,
        recipientCount: recipients.length,
        templateHandle,
      });
      await this.mailService.sendEmail(
        {
          entityHandle: this.entity.handle,
          itemHandle: emailList.handle,
          templateHandle,
          subject,
          bodyMarkdown,
          to: recipients,
        },
        this.user,
      );
      this.logDebug('execute', 'Email list delivery accepted by mail service', {
        emailListHandle: emailList.handle,
        recipientCount: recipients.length,
      });
    }

    this.logDebug('execute', 'Completed email list send action', {
      action: name,
      itemCount: items.length,
    });

    return new ScriptResultClient();
  }

  private normalizeParameter(parameter?: unknown): EmailListScriptParameter {
    this.logTrace(
      'normalizeParameter',
      'Normalizing script parameter payload',
      {
        parameterType: parameter == null ? 'nullish' : typeof parameter,
      },
    );

    if (typeof parameter !== 'object' || parameter === null) {
      this.logDebug(
        'normalizeParameter',
        'Parameter payload missing or not an object, using defaults',
      );
      return {};
    }

    const value = parameter as Record<string, unknown>;
    const normalized = {
      subject: typeof value.subject === 'string' ? value.subject : undefined,
      bodyMarkdown:
        typeof value.bodyMarkdown === 'string' ? value.bodyMarkdown : undefined,
      templateHandle:
        typeof value.templateHandle === 'number'
          ? value.templateHandle
          : undefined,
    };

    this.logDebug('normalizeParameter', 'Parameter payload normalized', {
      hasSubject: Boolean(normalized.subject?.trim()),
      hasBodyMarkdown: Boolean(normalized.bodyMarkdown?.trim()),
      templateHandle: normalized.templateHandle,
    });

    return normalized;
  }

  private async loadMailList(item: EMailListItem): Promise<EMailListItem> {
    this.logTrace('loadMailList', 'Loading email list with relations', {
      emailListHandle: item.handle,
      canReload: Boolean(this.em && item.handle != null),
    });

    if (!this.em || item.handle == null) {
      this.logDebug('loadMailList', 'Using provided email list instance', {
        emailListHandle: item.handle,
      });
      return item;
    }

    const loadedMailList = await this.em.findOne(
      EMailListItem,
      { handle: item.handle },
      { populate: ['mailTemplate', 'companies', 'persons'] },
    );

    this.logDebug('loadMailList', 'Email list load finished', {
      requestedHandle: item.handle,
      loadedHandle: loadedMailList?.handle,
      wasReloaded: Boolean(loadedMailList),
    });

    return loadedMailList ?? item;
  }

  private collectRecipients(emailList: EMailListItem): string[] {
    const seen = new Set<string>();
    const recipients: string[] = [];
    const companyRecipients = this.toArray(emailList.companies);
    const personRecipients = this.toArray(emailList.persons);

    this.logTrace('collectRecipients', 'Collecting email recipients', {
      emailListHandle: emailList.handle,
      companyCount: companyRecipients.length,
      personCount: personRecipients.length,
    });

    const pushRecipient = (value?: string | null) => {
      const normalized = value?.trim();

      if (!normalized) {
        this.logTrace('collectRecipients', 'Ignoring empty recipient entry', {
          emailListHandle: emailList.handle,
        });
        return;
      }

      const uniqueKey = normalized.toLowerCase();

      if (seen.has(uniqueKey)) {
        this.logDebug('collectRecipients', 'Ignoring duplicate recipient', {
          emailListHandle: emailList.handle,
          recipient: normalized,
        });
        return;
      }

      seen.add(uniqueKey);
      recipients.push(normalized);
      this.logTrace('collectRecipients', 'Accepted recipient entry', {
        emailListHandle: emailList.handle,
        recipient: normalized,
      });
    };

    for (const company of companyRecipients) {
      pushRecipient(company.email);
    }

    for (const person of personRecipients) {
      pushRecipient(person.email);
    }

    this.logDebug('collectRecipients', 'Recipient collection complete', {
      emailListHandle: emailList.handle,
      recipientCount: recipients.length,
    });

    return recipients;
  }

  private toArray<T extends object>(
    collection?: Collection<T> | T[] | null,
  ): T[] {
    if (!collection) {
      return [];
    }

    if (Array.isArray(collection)) {
      return collection;
    }

    return collection.isInitialized() ? (collection.toArray() as T[]) : [];
  }
}
