import {
  ScriptResultClient,
  ScriptResultClientMethods,
} from './core/script.result.client.js';
import { ScriptClass } from './core/script.class.js';

export class EffortEstimateController extends ScriptClass {
  async execute(
    items: object[],
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient> {
    if (name !== 'aiSuggestSimilarEstimates') {
      return super.execute(items, name, parameter);
    }

    void parameter;
    const item = this.requireSingleItem(items);
    const handle = this.requireHandle(item);
    return new ScriptResultClient(
      ScriptResultClientMethods.callURL,
      true,
      buildAiChatPromptUrl(
        buildEffortEstimatePrompt(handle, item),
        'Aufwandsschaetzung analysieren',
      ),
    );
  }

  private requireSingleItem(items: object[]): Record<string, unknown> {
    const item = items[0];

    if (items.length !== 1 || !item || typeof item !== 'object') {
      throw new Error('script.singleSelectionRequired');
    }

    return item as Record<string, unknown>;
  }

  private requireHandle(item: Record<string, unknown>): string | number {
    const handle = item.handle;

    if (
      (typeof handle === 'string' && handle.trim()) ||
      (typeof handle === 'number' && Number.isFinite(handle))
    ) {
      return handle;
    }

    throw new Error('global.invalidPayload');
  }
}

function buildEffortEstimatePrompt(
  handle: string | number,
  item: Record<string, unknown>,
): string {
  const title = normalizeString(item.title);
  const requirements = normalizeString(item.requirementsMarkdown);

  return [
    'Bitte analysiere diese Sapling-Aufwandsschaetzung und mache Phase-4-Vorschlaege.',
    '',
    `Aktuelle Aufwandsschaetzung: ${String(handle)}${title ? ` - ${title}` : ''}`,
    requirements
      ? `Bekannte Anforderungen aus der Liste: ${requirements}`
      : null,
    '',
    'Arbeitsweise:',
    '1. Lade die aktuelle Aufwandsschaetzung mit generic_get.',
    `   entityHandle: effortEstimate, handle: ${JSON.stringify(handle)}, relations: ["status", "ticket", "salesOpportunity", "positions"]`,
    '2. Baue aus Titel, Anforderungen, Ticket, Verkaufschance und vorhandenen Positionen eine Suchanfrage.',
    '3. Nutze knowledge_search mit entityHandles ["effortEstimate", "effortEstimatePosition", "knowledgeArticle", "ticket"].',
    '4. Wenn ein Vektorindex fehlt, nenne ihn kurz und nutze die verfuegbaren Quellen weiter.',
    '',
    'Gib mir kompakt:',
    '- aehnliche vergangene Schaetzungen und passende Positionen',
    '- typische Positionen, die hier wahrscheinlich gebraucht werden',
    '- sinnvolle Stundenbereiche je Position und insgesamt',
    '- Risiken, Annahmen und offene Fragen',
    '- welche Treffer als Referenz fuer Angebotstext oder Scope besonders taugen',
  ]
    .filter(
      (line): line is string => typeof line === 'string' && line.length > 0,
    )
    .join('\n');
}

function buildAiChatPromptUrl(prompt: string, title: string): string {
  const params = new URLSearchParams({
    prompt,
    title,
    autoSend: 'true',
    newChat: 'true',
  });

  return `sapling-ai-chat://prompt?${params.toString()}`;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}
