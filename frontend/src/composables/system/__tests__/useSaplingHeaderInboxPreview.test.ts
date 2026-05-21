import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SaplingHeaderInboxPreview } from '../useSaplingHeader'
import { useSaplingHeaderInboxPreview } from '../useSaplingHeaderInboxPreview'

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
    resolve: (route: unknown) => ({
      href: typeof route === 'string' ? route : '/table/ticket?filter=%7B%22handle%22%3A1%7D',
    }),
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

type NotificationHandler = ((event: Event) => void) | null

const originalNotification = globalThis.Notification
let notificationInstances: MockNotification[] = []
let throwOnNotificationCreate = false
let notificationConstructorAttempts = 0

class MockNotification {
  static permission: NotificationPermission = 'granted'
  static requestPermission = vi.fn(async () => MockNotification.permission)

  readonly title: string
  readonly options?: NotificationOptions
  onclick: NotificationHandler = null
  onclose: NotificationHandler = null
  onerror: NotificationHandler = null
  close = vi.fn(() => {
    this.onclose?.(new Event('close'))
  })

  constructor(title: string, options?: NotificationOptions) {
    notificationConstructorAttempts += 1

    if (throwOnNotificationCreate) {
      throw new Error('Notification failed')
    }

    this.title = title
    this.options = options
    notificationInstances.push(this)
  }
}

function mountHost() {
  return mount(
    defineComponent({
      setup() {
        const incomingInboxPreview = ref<SaplingHeaderInboxPreview | null>(null)
        const { visibleIncomingInboxPreview } = useSaplingHeaderInboxPreview(incomingInboxPreview)

        return {
          incomingInboxPreview,
          visibleIncomingInboxPreview,
        }
      },
      template: '<div />',
    }),
  )
}

function createPreview(sequence = 1): SaplingHeaderInboxPreview {
  return {
    id: `ticket:${sequence}`,
    kind: 'ticket',
    title: 'New ticket',
    bodyText: 'Please take a look',
    icon: 'mdi-ticket-confirmation-outline',
    timestamp: Date.now(),
    route: '/table/ticket',
    sequence,
  }
}

async function publishPreview(wrapper: ReturnType<typeof mountHost>, preview = createPreview()) {
  ;(
    wrapper.vm as unknown as { incomingInboxPreview: SaplingHeaderInboxPreview }
  ).incomingInboxPreview = preview
  await nextTick()
  await Promise.resolve()
}

describe('useSaplingHeaderInboxPreview', () => {
  beforeEach(() => {
    notificationInstances = []
    throwOnNotificationCreate = false
    notificationConstructorAttempts = 0
    MockNotification.permission = 'granted'
    MockNotification.requestPermission = vi.fn(async () => MockNotification.permission)
    pushMock.mockReset()
    vi.spyOn(window, 'focus').mockImplementation(() => undefined)

    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: MockNotification,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: originalNotification,
    })
    vi.restoreAllMocks()
  })

  it('uses the browser notification when permission is granted', async () => {
    const wrapper = mountHost()
    const preview = createPreview()

    await publishPreview(wrapper, preview)

    expect(notificationInstances).toHaveLength(1)
    expect(notificationInstances[0].title).toBe(preview.title)
    expect(notificationInstances[0].options?.body).toContain('navigation.ticket')
    expect(notificationInstances[0].options?.body).toContain(preview.bodyText)
    expect(notificationInstances[0].options?.data).toEqual({
      route: '/table/ticket',
    })
    expect(wrapper.vm.visibleIncomingInboxPreview).toBeNull()

    wrapper.unmount()
  })

  it('navigates to the preview route when the browser notification is clicked', async () => {
    const wrapper = mountHost()
    const preview = createPreview()

    await publishPreview(wrapper, preview)
    notificationInstances[0].onclick?.(new Event('click'))
    await Promise.resolve()

    expect(pushMock).toHaveBeenCalledWith(preview.route)

    wrapper.unmount()
  })

  it('uses the internal preview when browser notifications are denied', async () => {
    MockNotification.permission = 'denied'
    const wrapper = mountHost()
    const preview = createPreview()

    await publishPreview(wrapper, preview)

    expect(notificationInstances).toHaveLength(0)
    expect(wrapper.vm.visibleIncomingInboxPreview).toEqual(preview)

    wrapper.unmount()
  })

  it('falls back to the internal preview when creating a browser notification fails', async () => {
    throwOnNotificationCreate = true
    const wrapper = mountHost()
    const preview = createPreview()

    await publishPreview(wrapper, preview)

    expect(notificationConstructorAttempts).toBe(1)
    expect(notificationInstances).toHaveLength(0)
    expect(wrapper.vm.visibleIncomingInboxPreview).toEqual(preview)

    wrapper.unmount()
  })

  it('falls back to the internal preview when the browser notification errors', async () => {
    const wrapper = mountHost()
    const preview = createPreview()

    await publishPreview(wrapper, preview)
    notificationInstances[0].onerror?.(new Event('error'))
    await Promise.resolve()

    expect(wrapper.vm.visibleIncomingInboxPreview).toEqual(preview)

    wrapper.unmount()
  })
})
