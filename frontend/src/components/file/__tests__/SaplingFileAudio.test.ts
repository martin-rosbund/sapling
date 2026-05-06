import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SaplingFileAudio from '../SaplingFileAudio.vue'

describe('SaplingFileAudio', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stops and reloads the player when the audio source changes', async () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const loadSpy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})

    const wrapper = mount(SaplingFileAudio, {
      props: {
        audioUrl: 'https://example.com/first.mp3',
        mimeType: 'audio/mpeg',
        fileName: 'first.mp3',
      },
      global: {
        stubs: {
          'v-icon': true,
        },
      },
    })

    pauseSpy.mockClear()
    loadSpy.mockClear()

    await wrapper.setProps({
      audioUrl: 'https://example.com/second.mp3',
      fileName: 'second.mp3',
    })
    await nextTick()

    expect(pauseSpy).toHaveBeenCalledOnce()
    expect(loadSpy).toHaveBeenCalledOnce()

    wrapper.unmount()
  })
})
