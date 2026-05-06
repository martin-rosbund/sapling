import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SaplingFileVideo from '../SaplingFileVideo.vue'

describe('SaplingFileVideo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stops and reloads the player when the video source changes', async () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const loadSpy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})

    const wrapper = mount(SaplingFileVideo, {
      props: {
        videoUrl: 'https://example.com/first.mp4',
        mimeType: 'video/mp4',
        fileName: 'first.mp4',
      },
    })

    pauseSpy.mockClear()
    loadSpy.mockClear()

    await wrapper.setProps({
      videoUrl: 'https://example.com/second.mp4',
      fileName: 'second.mp4',
    })
    await nextTick()

    expect(pauseSpy).toHaveBeenCalledOnce()
    expect(loadSpy).toHaveBeenCalledOnce()

    wrapper.unmount()
  })
})
