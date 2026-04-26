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
    if (name !== 'sendMail') {
      return super.execute(items, name, parameter);
    }

    if (!this.em || !this.mailService) {
      return new ScriptResultClient();
    }

    const options = this.normalizeParameter(parameter);

    for (const item of items as EMailListItem[]) {
      const emailList = await this.loadMailList(item);
      const recipients = this.collectRecipients(emailList);

      if (recipients.length === 0) {
        throw new BadRequestException('global.scriptEmailRecipientsRequired');
      }

      const templateHandle =
        options.templateHandle ?? emailList.mailTemplate?.handle;
      const subject = options.subject?.trim();
      const bodyMarkdown = options.bodyMarkdown?.trim();

      if (!templateHandle && !subject && !bodyMarkdown) {
        throw new BadRequestException('global.scriptEmailTemplateRequired');
      }

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
    }

    global.log.trace(
      `scriptClass - execute - ${this.entity.handle} - action sendMail - count items ${items.length}`,
    );

    return new ScriptResultClient();
  }

  private normalizeParameter(parameter?: unknown): EmailListScriptParameter {
    if (typeof parameter !== 'object' || parameter === null) {
      return {};
    }

    const value = parameter as Record<string, unknown>;

    return {
      subject: typeof value.subject === 'string' ? value.subject : undefined,
      bodyMarkdown:
        typeof value.bodyMarkdown === 'string' ? value.bodyMarkdown : undefined,
      templateHandle:
        typeof value.templateHandle === 'number'
          ? value.templateHandle
          : undefined,
    };
  }

  private async loadMailList(item: EMailListItem): Promise<EMailListItem> {
    if (!this.em || item.handle == null) {
      return item;
    }

    const loadedMailList = await this.em.findOne(
      EMailListItem,
      { handle: item.handle },
      { populate: ['mailTemplate', 'companies', 'persons'] },
    );

    return loadedMailList ?? item;
  }

  private collectRecipients(emailList: EMailListItem): string[] {
    const seen = new Set<string>();
    const recipients: string[] = [];
    const pushRecipient = (value?: string | null) => {
      const normalized = value?.trim();

      if (!normalized) {
        return;
      }

      const uniqueKey = normalized.toLowerCase();

      if (seen.has(uniqueKey)) {
        return;
      }

      seen.add(uniqueKey);
      recipients.push(normalized);
    };

    for (const company of this.toArray(emailList.companies)) {
      pushRecipient(company.email);
    }

    for (const person of this.toArray(emailList.persons)) {
      pushRecipient(person.email);
    }

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
