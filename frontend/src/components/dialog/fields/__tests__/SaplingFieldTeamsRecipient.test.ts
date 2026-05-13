import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EntityTemplate } from '@/entity/structure'

const { loadGenericMock, loadGenericManyMock } = vi.hoisted(() => ({
  loadGenericMock: vi.fn(),
  loadGenericManyMock: vi.fn(),
}))

const entityTemplatesByHandle: Record<string, EntityTemplate[]> = {
  event: [
    createTemplate({
      name: 'assigneePerson',
      type: 'PersonItem',
      kind: 'm:1',
      isReference: true,
      referenceName: 'person',
    }),
    createTemplate({
      name: 'participants',
      type: 'PersonItem',
      kind: 'm:n',
      isReference: true,
      referenceName: 'person',
    }),
    createTemplate({
      name: 'ticket',
      type: 'TicketItem',
      kind: 'm:1',
      isReference: true,
      referenceName: 'ticket',
    }),
    createTemplate({
      name: 'salesOpportunity',
      type: 'SalesOpportunityItem',
      kind: 'm:1',
      isReference: true,
      referenceName: 'salesOpportunity',
    }),
  ],
  ticket: [
    createTemplate({
      name: 'assigneePerson',
      type: 'PersonItem',
      kind: 'm:1',
      isReference: true,
      referenceName: 'person',
    }),
  ],
  salesOpportunity: [
    createTemplate({
      name: 'assigneePerson',
      type: 'PersonItem',
      kind: 'm:1',
      isReference: true,
      referenceName: 'person',
    }),
  ],
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          'event.assigneePerson': 'Responsible person',
          'event.participants': 'Participants',
          'event.ticket': 'Ticket',
          'event.salesOpportunity': 'Sales opportunity',
          'ticket.assigneePerson': 'Ticket owner',
          'salesOpportunity.assigneePerson': 'Opportunity owner',
        }) as Record<string, string>
      )[key] ?? key,
    te: (key: string) =>
      [
        'event.assigneePerson',
        'event.participants',
        'event.ticket',
        'event.salesOpportunity',
        'ticket.assigneePerson',
        'salesOpportunity.assigneePerson',
      ].includes(key),
  }),
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    getState: (entityHandle: string) => ({
      entityTemplates: entityTemplatesByHandle[entityHandle] ?? [],
    }),
    loadGeneric: loadGenericMock,
    loadGenericMany: loadGenericManyMock,
  }),
}))

import SaplingFieldTeamsRecipient from '../SaplingFieldTeamsRecipient.vue'

const VSelectStub = defineComponent({
  name: 'v-select',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  template: '<div />',
})

describe('SaplingFieldTeamsRecipient', () => {
  beforeEach(() => {
    loadGenericMock.mockReset()
    loadGenericManyMock.mockReset()
    loadGenericMock.mockResolvedValue(undefined)
    loadGenericManyMock.mockResolvedValue(undefined)
  })

  it('includes collection recipients and nested m:1 recipients for inbox subscriptions', async () => {
    const wrapper = mount(SaplingFieldTeamsRecipient, {
      props: {
        label: 'Recipient',
        entityReference: { handle: 'event' },
        allowCollectionRecipients: true,
      },
      global: {
        stubs: {
          'v-select': VSelectStub,
        },
      },
    })

    await flushPromises()

    expect(loadGenericMock).toHaveBeenCalledWith('event', 'global')
    expect(loadGenericManyMock).toHaveBeenCalledWith([
      { entityHandle: 'ticket', namespaces: ['global'] },
      { entityHandle: 'salesOpportunity', namespaces: ['global'] },
    ])

    expect(wrapper.findComponent(VSelectStub).props('items')).toEqual([
      { label: 'Participants', value: 'participants' },
      { label: 'Responsible person', value: 'assigneePerson' },
      {
        label: 'Sales opportunity -> Opportunity owner',
        value: 'salesOpportunity.assigneePerson',
      },
      { label: 'Ticket -> Ticket owner', value: 'ticket.assigneePerson' },
    ])
  })

  it('excludes collection recipients for teams subscriptions while keeping nested m:1 recipients', async () => {
    const wrapper = mount(SaplingFieldTeamsRecipient, {
      props: {
        label: 'Recipient',
        entityReference: { handle: 'event' },
        allowCollectionRecipients: false,
      },
      global: {
        stubs: {
          'v-select': VSelectStub,
        },
      },
    })

    await flushPromises()

    expect(wrapper.findComponent(VSelectStub).props('items')).toEqual([
      { label: 'Responsible person', value: 'assigneePerson' },
      {
        label: 'Sales opportunity -> Opportunity owner',
        value: 'salesOpportunity.assigneePerson',
      },
      { label: 'Ticket -> Ticket owner', value: 'ticket.assigneePerson' },
    ])
  })
})

function createTemplate(
  overrides: Partial<EntityTemplate> & Pick<EntityTemplate, 'name' | 'type'>,
): EntityTemplate {
  return {
    key: overrides.name,
    name: overrides.name,
    type: overrides.type,
    kind: overrides.kind ?? null,
    referenceName: overrides.referenceName,
    isReference: overrides.isReference ?? false,
    isPersistent: true,
    isAutoIncrement: false,
    isPrimaryKey: false,
    isRequired: false,
    isUnique: false,
    nullable: true,
    referencedPks: ['handle'],
    options: [],
  } as EntityTemplate
}
