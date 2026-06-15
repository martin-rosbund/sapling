import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { i18n } from '@/i18n'
import SaplingPermissionProviderUserImportDialog from './SaplingPermissionProviderUserImportDialog.vue'
import ApiProviderUsersService from '@/services/api.provider-users.service'
import type { RoleItem, SaplingGenericItem } from '@/entity/entity'

vi.mock('@/stores/currentPersonStore', () => ({
  useCurrentPersonStore: () => ({
    person: {
      type: { handle: 'azure' },
    },
  }),
}))

vi.mock('@/services/api.provider-users.service', () => ({
  default: {
    list: vi.fn(),
    importUsers: vi.fn(),
  },
}))

const vuetify = createVuetify({
  components,
  directives,
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}

function createRole(): RoleItem {
  return {
    handle: 7,
    title: 'Support',
    isAdministrator: false,
    stage: { handle: 'global', title: 'Global', createdAt: new Date() },
    createdAt: new Date(),
  }
}

describe('SaplingPermissionProviderUserImportDialog', () => {
  beforeAll(() => {
    vi.stubGlobal('visualViewport', {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      scale: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ApiProviderUsersService.list).mockResolvedValue({
      users: [
        {
          provider: 'azure',
          id: 'azure-1',
          displayName: 'Ada Lovelace',
          email: 'ada@example.com',
          existingPersonHandle: null,
        },
      ],
      nextPageToken: null,
    })
    vi.mocked(ApiProviderUsersService.importUsers).mockResolvedValue({
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 0,
      rows: [],
    })
  })

  it('loads provider users when opened', async () => {
    const wrapper = mount(SaplingPermissionProviderUserImportDialog, {
      props: {
        modelValue: true,
        roles: [createRole()],
        selectedRole: createRole(),
      },
      global: {
        plugins: [vuetify, i18n],
        directives: {
          tilt: {},
        },
        stubs: {
          SaplingFieldSelect: true,
          SaplingFieldSingleSelect: true,
        },
      },
    })

    await flushPromises()

    expect(ApiProviderUsersService.list).toHaveBeenCalledWith({
      provider: 'azure',
      search: '',
      signal: expect.any(AbortSignal),
    })
    expect((wrapper.vm as unknown as { users: unknown[] }).users).toEqual([
      expect.objectContaining({ displayName: 'Ada Lovelace' }),
    ])
  })

  it('imports selected users with selected roles', async () => {
    const wrapper = mount(SaplingPermissionProviderUserImportDialog, {
      props: {
        modelValue: true,
        roles: [createRole()],
        selectedRole: createRole(),
      },
      global: {
        plugins: [vuetify, i18n],
        directives: {
          tilt: {},
        },
        stubs: {
          SaplingFieldSelect: true,
          SaplingFieldSingleSelect: true,
        },
      },
    })

    await flushPromises()

    const vm = wrapper.vm as unknown as {
      toggleUser: (userId: string, selected: boolean) => void
      saveImport: () => Promise<void>
      selectedRoles: SaplingGenericItem[]
    }
    vm.toggleUser('azure-1', true)
    vm.selectedRoles = [createRole() as SaplingGenericItem]
    await vm.saveImport()
    await flushPromises()

    expect(ApiProviderUsersService.importUsers).toHaveBeenCalledWith({
      provider: 'azure',
      userIds: ['azure-1'],
      roleHandles: [7],
      companyHandle: null,
    })
    expect(wrapper.emitted('imported')).toBeTruthy()
  })
})
