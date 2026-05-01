import { EntityManager, type EntityName } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TemplateService } from './template.service';
import { PersonItem } from '../../entity/PersonItem';

type JsonRecord = Record<string, unknown>;

type MessageContextOptions = {
  entityHandle: string;
  itemHandle?: string | number;
  currentUser?: PersonItem;
  draftValues?: Record<string, unknown>;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function tokenizeTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparatorLine(line: string): boolean {
  const cells = tokenizeTableRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isHorizontalRuleLine(line: string): boolean {
  return /^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line);
}

function renderInlineMarkdown(value: string): string {
  const placeholders: string[] = [];
  const protect = (html: string): string =>
    `@@SAPLINGPLACEHOLDER${placeholders.push(html) - 1}@@`;

  let rendered = escapeHtml(value);

  rendered = rendered.replace(/`([^`]+)`/g, (_match, code: string) =>
    protect(`<code>${escapeHtml(code)}</code>`),
  );
  rendered = rendered.replace(
    /!\[([^\]]*)\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g,
    (_match, alt: string, url: string) =>
      protect(
        `<img src="${escapeAttribute(url.trim())}" alt="${escapeAttribute(alt)}" />`,
      ),
  );
  rendered = rendered.replace(
    /\[([^\]]+)\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g,
    (_match, label: string, url: string) =>
      protect(
        `<a href="${escapeAttribute(url.trim())}" target="_blank" rel="noopener noreferrer">${renderInlineMarkdown(label)}</a>`,
      ),
  );
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  rendered = rendered.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  rendered = rendered.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  rendered = rendered.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

  return rendered.replace(
    /@@SAPLINGPLACEHOLDER(\d+)@@/g,
    (_match, index: string) => {
      const placeholder = placeholders[Number(index)];
      return placeholder ?? '';
    },
  );
}

function renderMarkdownBlocks(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index] ?? '';
    const trimmedLine = currentLine.trim();

    if (!trimmedLine) {
      index += 1;
      continue;
    }

    const fenceMatch = currentLine.match(/^```([\w-]+)?\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1]?.trim();
      const codeLines: string[] = [];

      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? '')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      const className = language
        ? ` class="language-${escapeAttribute(language)}"`
        : '';
      html.push(
        `<pre><code${className}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      );
      continue;
    }

    const headingMatch = currentLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`,
      );
      index += 1;
      continue;
    }

    if (isHorizontalRuleLine(currentLine)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (/^>\s?/.test(currentLine)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quoteLines.push((lines[index] ?? '').replace(/^>\s?/, ''));
        index += 1;
      }

      html.push(
        `<blockquote>${renderMarkdownBlocks(quoteLines.join('\n'))}</blockquote>`,
      );
      continue;
    }

    const nextLine = lines[index + 1] ?? '';
    if (currentLine.includes('|') && isTableSeparatorLine(nextLine)) {
      const headerCells = tokenizeTableRow(currentLine);
      const bodyRows: string[][] = [];

      index += 2;
      while (index < lines.length && (lines[index] ?? '').includes('|')) {
        bodyRows.push(tokenizeTableRow(lines[index] ?? ''));
        index += 1;
      }

      const head = `<thead><tr>${headerCells
        .map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`)
        .join('')}</tr></thead>`;
      const body = bodyRows.length
        ? `<tbody>${bodyRows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody>`
        : '';

      html.push(`<table>${head}${body}</table>`);
      continue;
    }

    if (/^- \[[ xX]\]\s+/.test(currentLine)) {
      const items: string[] = [];

      while (
        index < lines.length &&
        /^- \[[ xX]\]\s+/.test(lines[index] ?? '')
      ) {
        const match = (lines[index] ?? '').match(/^- \[([ xX])\]\s+(.*)$/);
        const checked = (match?.[1] ?? ' ').toLowerCase() === 'x';
        const content = renderInlineMarkdown(match?.[2] ?? '');
        items.push(
          `<li class="task-list-item"><input type="checkbox" disabled${checked ? ' checked' : ''}> ${content}</li>`,
        );
        index += 1;
      }

      html.push(`<ul class="contains-task-list">${items.join('')}</ul>`);
      continue;
    }

    if (/^-\s+/.test(currentLine)) {
      const items: string[] = [];

      while (index < lines.length && /^-\s+/.test(lines[index] ?? '')) {
        const content = (lines[index] ?? '').replace(/^-\s+/, '');
        items.push(`<li>${renderInlineMarkdown(content)}</li>`);
        index += 1;
      }

      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(currentLine)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? '')) {
        const content = (lines[index] ?? '').replace(/^\d+\.\s+/, '');
        items.push(`<li>${renderInlineMarkdown(content)}</li>`);
        index += 1;
      }

      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index] ?? '';
      const paragraphTrimmed = paragraphLine.trim();

      if (!paragraphTrimmed) {
        break;
      }

      if (
        /^```([\w-]+)?\s*$/.test(paragraphLine) ||
        /^(#{1,6})\s+/.test(paragraphLine) ||
        /^>\s?/.test(paragraphLine) ||
        isHorizontalRuleLine(paragraphLine) ||
        /^- \[[ xX]\]\s+/.test(paragraphLine) ||
        /^-\s+/.test(paragraphLine) ||
        /^\d+\.\s+/.test(paragraphLine) ||
        (paragraphLine.includes('|') &&
          isTableSeparatorLine(lines[index + 1] ?? ''))
      ) {
        break;
      }

      paragraphLines.push(paragraphLine);
      index += 1;
    }

    html.push(
      `<p>${paragraphLines.map((line) => renderInlineMarkdown(line)).join('<br>')}</p>`,
    );
  }

  return html.join('');
}

@Injectable()
export class MessageTemplateService {
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
  ) {}

  async buildContext(options: MessageContextOptions): Promise<JsonRecord> {
    const base = options.itemHandle
      ? await this.loadEntityContext(options.entityHandle, options.itemHandle)
      : {};

    return {
      ...(options.currentUser ? { currentUser: options.currentUser } : {}),
      ...base,
      ...(options.draftValues ?? {}),
    };
  }

  async loadEntityContext(
    entityHandle: string,
    itemHandle: string | number,
  ): Promise<JsonRecord> {
    const entityClass = ENTITY_MAP[entityHandle] as
      | EntityName<object>
      | undefined;
    if (!entityClass) {
      throw new NotFoundException('global.entityNotFound');
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
    const populate = template
      .filter((entry) => entry.isReference)
      .map((entry) => entry.name);
    const normalizedHandle = this.normalizeHandleValue(itemHandle);
    const item = await this.em.findOne(
      entityClass,
      { handle: normalizedHandle },
      { populate: populate as never[] },
    );

    if (!item) {
      throw new NotFoundException('global.entryNotFound');
    }

    return item;
  }

  replaceRecipients(
    input: string[] | string | undefined,
    context: JsonRecord,
  ): string[] {
    return this.normalizeRecipients(input).map((recipient) =>
      this.replacePlaceholders(recipient, context),
    );
  }

  replacePlaceholders(template: string, context: JsonRecord): string {
    return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression) => {
      const value = this.getContextValue(context, String(expression).trim());
      if (Array.isArray(value)) {
        return value
          .map((entry) =>
            typeof entry === 'string' || typeof entry === 'number'
              ? String(entry)
              : '',
          )
          .filter(Boolean)
          .join(', ');
      }

      if (value === null || value === undefined) {
        return '';
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }

      return '';
    });
  }

  renderMarkdown(markdown: string): string {
    return renderMarkdownBlocks(markdown ?? '');
  }

  stripMarkdown(markdown: string): string {
    return this.htmlToPlainText(this.renderMarkdown(markdown));
  }

  getContextValue(context: JsonRecord, expression: string): unknown {
    return expression.split('.').reduce<unknown>((current, key) => {
      if (Array.isArray(current)) {
        const entries = current as unknown[];

        return entries.flatMap((entry) => {
          const value = this.resolveContextSegment(entry, key);

          if (Array.isArray(value)) {
            return value as unknown[];
          }

          return value === undefined || value === null ? [] : [value];
        });
      }

      return this.resolveContextSegment(current, key);
    }, context);
  }

  private normalizeHandleValue(value: string | number): string | number {
    if (typeof value === 'number') {
      return value;
    }

    return /^\d+$/.test(value) ? Number(value) : value;
  }

  private normalizeRecipients(input: string[] | string | undefined): string[] {
    if (!input) {
      return [];
    }

    const values = Array.isArray(input) ? input : input.split(/[;,]/);
    return values.map((value) => value.trim()).filter(Boolean);
  }

  private resolveContextSegment(current: unknown, key: string): unknown {
    if (Array.isArray(current)) {
      const entries = current as unknown[];

      return entries.flatMap((entry) => {
        const value = this.resolveContextSegment(entry, key);

        if (Array.isArray(value)) {
          return value as unknown[];
        }

        return value === undefined || value === null ? [] : [value];
      });
    }

    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }

  private htmlToPlainText(html: string): string {
    return this.decodeHtmlEntities(
      html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|blockquote|pre|tr)>/gi, '\n')
        .replace(/<\/(ul|ol|table|thead|tbody)>/gi, '\n')
        .replace(/<t[dh][^>]*>/gi, '')
        .replace(/<\/t[dh]>/gi, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/\t\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n'),
    ).trim();
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
