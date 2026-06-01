import { describe, expect, it, vi } from 'vitest'

import {
  handleScriptResultClient,
  SAPLING_AI_CHAT_PROMPT_EVENT,
  ScriptResultClientMethod,
} from '../saplingScriptResultUtil'

describe('saplingScriptResultUtil', () => {
  it('opens Songbird prompt actions through the app event bridge', async () => {
    const router = { push: vi.fn() }
    const listener = vi.fn()
    const prompt = 'Welche Tickets passen zu dieser Chance?'

    window.addEventListener(SAPLING_AI_CHAT_PROMPT_EVENT, listener)

    try {
      await handleScriptResultClient(
        {
          isSuccess: true,
          method: ScriptResultClientMethod.callURL,
          parameter: `sapling-ai-chat://prompt?prompt=${encodeURIComponent(
            prompt,
          )}&autoSend=false&newChat=false`,
          item: {},
        },
        {
          entity: 'salesOpportunity',
          router: router as never,
        },
      )
    } finally {
      window.removeEventListener(SAPLING_AI_CHAT_PROMPT_EVENT, listener)
    }

    expect(router.push).not.toHaveBeenCalled()
    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      prompt,
      autoSend: false,
      newChat: false,
      title: undefined,
    })
  })
})
