import type { Router } from 'vue-router'
import type { SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type { ScriptResultClient } from '@/services/api.script.service'

export enum ScriptResultClientMethod {
  none = 0,
  showMessage = 1,
  callURL = 2,
  setItemData = 3,
}

type PushMessage = (
  type: 'error' | 'info' | 'success' | 'warning',
  message: string,
  description: string,
  entity: string,
  technical?: unknown,
) => void

type Translate = (key: string, values?: Record<string, unknown>, plural?: number) => string
type HasTranslation = (key: string) => boolean

type ScriptMessageParameter = {
  message?: string
  description?: string
  entity?: string
  technical?: unknown
}

type AiChatPromptDetail = {
  prompt: string
  autoSend: boolean
  newChat: boolean
  title?: string
}

export const SAPLING_AI_CHAT_PROMPT_EVENT = 'sapling-ai-chat-prompt'

export async function handleScriptResultClient(
  result: ScriptResultClient,
  options: {
    entity: string
    pushMessage?: PushMessage
    router?: Router
    onItemData?: (item: object) => void | Promise<void>
  },
) {
  switch (result.method) {
    case ScriptResultClientMethod.showMessage:
      showResultMessage(result, options)
      break
    case ScriptResultClientMethod.callURL:
      await openResultUrl(result.parameter, options.router)
      break
    case ScriptResultClientMethod.setItemData:
      if (options.onItemData && result.item) {
        await options.onItemData(result.item)
      }
      break
    default:
      break
  }
}

function showResultMessage(
  result: ScriptResultClient,
  options: {
    entity: string
    pushMessage?: PushMessage
  },
) {
  if (!options.pushMessage || !result.parameter) {
    return
  }

  const parameter = parseMessageParameter(result.parameter)
  options.pushMessage(
    result.isSuccess === false ? 'error' : 'success',
    parameter.message || result.parameter,
    parameter.description || '',
    parameter.entity || options.entity,
    parameter.technical,
  )
}

async function openResultUrl(url: string, router?: Router) {
  const normalizedUrl = url.trim()

  if (!normalizedUrl) {
    return
  }

  const aiChatPrompt = parseAiChatPromptUrl(normalizedUrl)
  if (aiChatPrompt) {
    window.dispatchEvent(new CustomEvent(SAPLING_AI_CHAT_PROMPT_EVENT, { detail: aiChatPrompt }))
    return
  }

  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    window.open(normalizedUrl, '_blank')
    return
  }

  if (router) {
    await router.push(normalizedUrl)
    return
  }

  window.open(normalizedUrl, '_self')
}

function parseMessageParameter(parameter: string): ScriptMessageParameter {
  try {
    const parsed = JSON.parse(parameter) as unknown

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ScriptMessageParameter
    }
  } catch {
    // Plain translation keys are valid script message parameters.
  }

  return { message: parameter }
}

function parseAiChatPromptUrl(url: string): AiChatPromptDetail | null {
  if (!url.startsWith('sapling-ai-chat://')) {
    return null
  }

  try {
    const parsedUrl = new URL(url)
    const prompt =
      parsedUrl.searchParams.get('prompt')?.trim() ||
      parsedUrl.searchParams.get('content')?.trim() ||
      ''

    if (!prompt) {
      return null
    }

    return {
      prompt,
      autoSend: parseBooleanSearchParam(parsedUrl.searchParams.get('autoSend'), true),
      newChat: parseBooleanSearchParam(parsedUrl.searchParams.get('newChat'), true),
      title: parsedUrl.searchParams.get('title')?.trim() || undefined,
    }
  } catch {
    return null
  }
}

function parseBooleanSearchParam(value: string | null, fallback: boolean): boolean {
  if (value == null || value.trim() === '') {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export function buildScriptButtonExecutionKey(
  button: ScriptButtonItem,
  items: SaplingGenericItem[],
): string {
  const buttonKey = String(button.handle ?? button.name ?? button.title ?? 'script')
  const itemKeys = items.map((item, index) => String(item.handle ?? `index-${index}`)).join(',')

  return `${buttonKey}:${itemKeys}`
}

export function resolveScriptButtonDisplayTitle(
  button: ScriptButtonItem,
  translate: Translate,
  hasTranslation: HasTranslation,
): string {
  const title = typeof button.title === 'string' ? button.title.trim() : ''

  if (title) {
    return hasTranslation(title) ? translate(title) : title
  }

  const name = typeof button.name === 'string' ? button.name.trim() : ''
  return name || translate('global.scriptAction')
}

export function pushScriptButtonStartedMessage(options: {
  button: ScriptButtonItem
  entity: string
  itemCount: number
  pushMessage: PushMessage
  translate: Translate
  hasTranslation: HasTranslation
}): void {
  const action = resolveScriptButtonDisplayTitle(
    options.button,
    options.translate,
    options.hasTranslation,
  )
  const descriptionKey =
    options.itemCount === 1
      ? 'global.scriptActionStartedDescription'
      : 'global.scriptActionStartedDescriptionWithCount'

  options.pushMessage(
    'info',
    options.translate('global.scriptActionStarted'),
    options.translate(descriptionKey, { action, count: options.itemCount }, options.itemCount),
    options.entity,
  )
}

export function pushScriptButtonAlreadyRunningMessage(options: {
  button: ScriptButtonItem
  entity: string
  pushMessage: PushMessage
  translate: Translate
  hasTranslation: HasTranslation
}): void {
  const action = resolveScriptButtonDisplayTitle(
    options.button,
    options.translate,
    options.hasTranslation,
  )

  options.pushMessage(
    'warning',
    options.translate('global.scriptActionAlreadyRunning'),
    options.translate('global.scriptActionAlreadyRunningDescription', { action }),
    options.entity,
  )
}
