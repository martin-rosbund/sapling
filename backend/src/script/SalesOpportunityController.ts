import {
  ScriptResultClient,
  ScriptResultClientMethods,
} from './core/script.result.client.js';
import { ScriptClass } from './core/script.class.js';

export class SalesOpportunityController extends ScriptClass {
  async execute(
    items: object[],
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient> {
    if (name !== 'aiFindOpportunityReferences') {
      return super.execute(items, name, parameter);
    }

    void parameter;
    const item = this.requireSingleItem(items);
    const handle = this.requireHandle(item);
    return new ScriptResultClient(
      ScriptResultClientMethods.callURL,
      true,
      buildAiChatPromptUrl(
        buildSalesOpportunityPrompt(handle, item),
        'Verkaufschance mit Referenzen analysieren',
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

function buildSalesOpportunityPrompt(
  handle: string | number,
  item: Record<string, unknown>,
): string {
  const title = normalizeString(item.title);
  const description = normalizeString(item.description);
  const painPoints = normalizeString(item.painPoints);

  return [
    'Bitte analysiere diese Sapling-Verkaufschance und finde nutzbare Referenzen.',
    '',
    `Aktuelle Verkaufschance: ${String(handle)}${title ? ` - ${title}` : ''}`,
    description ? `Bekannte Beschreibung aus der Liste: ${description}` : null,
    painPoints ? `Bekannte Pain Points aus der Liste: ${painPoints}` : null,
    '',
    'Arbeitsweise:',
    '1. Lade die aktuelle Verkaufschance mit generic_get.',
    `   entityHandle: salesOpportunity, handle: ${JSON.stringify(handle)}, relations: ["type", "forecast", "source", "tickets", "effortEstimates"]`,
    '2. Baue aus Titel, Beschreibung, Pain Points, Kundensituation und verknuepften Datensaetzen eine Suchanfrage.',
    '3. Nutze knowledge_search mit entityHandles ["salesOpportunity", "ticket", "effortEstimate", "effortEstimatePosition", "knowledgeArticle"].',
    '4. Wenn ein Vektorindex fehlt, nenne ihn kurz und nutze die verfuegbaren Quellen weiter.',
    '',
    'Gib mir kompakt:',
    '- aehnliche Pain Points und wie sie geloest wurden',
    '- passende Tickets, Schaetzungen und Positionen',
    '- Argumente, Referenzloesungen und wiederverwendbare Angebotsbausteine',
    '- Risiken, Einwaende und naechste Fragen fuer Sales',
    '- eine kurze Antwort auf: Welche Tickets/Schaetzungen passen zu dieser Chance?',
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
