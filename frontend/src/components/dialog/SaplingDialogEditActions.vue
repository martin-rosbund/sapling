<template>
  <SaplingActionBarSkeleton v-if="isLoading" />
  <SaplingActionBar v-else-if="mode === 'readonly'">
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="emit('cancel')">
        <template v-if="mdAndUp">{{ t('global.close') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <template v-if="smAndDown">
        <v-menu v-if="hasReadonlyMobileActionMenu">
          <template #activator="{ props: menuProps }">
            <v-btn
              variant="text"
              icon="mdi-dots-horizontal-circle-outline"
              v-bind="menuProps"
              :disabled="recordActionButtonsDisabled"
            />
          </template>

          <v-list
            class="glass-panel sapling-mobile-action-list sapling-dialog-edit__mobile-action-list"
            density="comfortable"
            min-width="260"
          >
            <template
              v-for="(group, groupIdx) in mobileRecordActionMenuGroups"
              :key="`readonly-group-${groupIdx}`"
            >
              <v-list-item
                v-for="(menuItem, itemIdx) in group"
                :key="getMobileRecordActionKey(menuItem, groupIdx, itemIdx)"
                :prepend-icon="menuItem.icon"
                :title="resolveRecordActionMenuTitle(menuItem)"
                :disabled="recordActionButtonsDisabled"
                @click="emit('select-action', menuItem)"
              />
              <v-divider
                v-if="
                  groupIdx < mobileRecordActionMenuGroups.length - 1 ||
                  (groupIdx === mobileRecordActionMenuGroups.length - 1 && canDeleteRecord)
                "
              />
            </template>

            <v-list-item
              v-if="canDeleteRecord"
              prepend-icon="mdi-delete-outline"
              :title="t('global.delete')"
              :disabled="recordActionButtonsDisabled"
              @click="emit('delete')"
            />
          </v-list>
        </v-menu>
      </template>
      <template v-else>
        <v-menu v-if="recordActionMenuItems.length > 0">
          <template #activator="{ props: menuProps }">
            <v-btn
              variant="text"
              prepend-icon="mdi-dots-horizontal-circle-outline"
              v-bind="menuProps"
              :disabled="recordActionButtonsDisabled"
            >
              <template v-if="mdAndUp">{{ t('global.more') }}</template>
            </v-btn>
          </template>

          <SaplingRecordActionMenuList
            density="comfortable"
            min-width="260"
            :menu-items="recordActionMenuItems"
            :show-edit="false"
            @select="emit('select-action', $event)"
          />
        </v-menu>

        <v-btn
          v-if="canDeleteRecord"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-outline"
          :disabled="recordActionButtonsDisabled"
          @click="emit('delete')"
        >
          <template v-if="mdAndUp">{{ t('global.delete') }}</template>
        </v-btn>
      </template>
    </template>
  </SaplingActionBar>
  <SaplingActionBar v-else>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" :disabled="isSaving" @click="emit('cancel')">
        <template v-if="mdAndUp">{{ t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <template v-if="smAndDown">
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn
              variant="text"
              icon="mdi-dots-horizontal-circle-outline"
              v-bind="menuProps"
              :disabled="editMobileSecondaryActionsDisabled"
            />
          </template>

          <v-list
            class="glass-panel sapling-mobile-action-list sapling-dialog-edit__mobile-action-list"
            density="comfortable"
            min-width="260"
          >
            <v-list-item
              prepend-icon="mdi-content-save-check"
              :title="t('global.saveAndClose')"
              :disabled="!isDirty || isSaving"
              @click="emit('save-and-close')"
            />
            <v-list-item
              prepend-icon="mdi-restore"
              :title="resetButtonLabel"
              :disabled="!isDirty || isSaving"
              @click="emit('reset')"
            />
            <v-divider v-if="canDeleteRecord || mobileRecordActionMenuGroups.length > 0" />
            <v-list-item
              v-if="canDeleteRecord"
              prepend-icon="mdi-delete-outline"
              :title="t('global.delete')"
              :disabled="recordActionButtonsDisabled"
              @click="emit('delete')"
            />
            <v-divider v-if="canDeleteRecord && mobileRecordActionMenuGroups.length > 0" />
            <template
              v-for="(group, groupIdx) in mobileRecordActionMenuGroups"
              :key="`edit-group-${groupIdx}`"
            >
              <v-list-item
                v-for="(menuItem, itemIdx) in group"
                :key="getMobileRecordActionKey(menuItem, groupIdx, itemIdx)"
                :prepend-icon="menuItem.icon"
                :title="resolveRecordActionMenuTitle(menuItem)"
                :disabled="recordActionButtonsDisabled"
                @click="emit('select-action', menuItem)"
              />
              <v-divider v-if="groupIdx < mobileRecordActionMenuGroups.length - 1" />
            </template>
          </v-list>
        </v-menu>

        <v-btn
          class="sapling-mobile-primary-action sapling-dialog-edit__mobile-primary-action"
          color="primary"
          prepend-icon="mdi-content-save"
          :disabled="!isDirty || isSaving"
          :loading="pendingSaveAction === 'save'"
          @click="emit('save')"
        />
      </template>
      <template v-else>
        <v-menu v-if="recordActionMenuItems.length > 0">
          <template #activator="{ props: menuProps }">
            <v-btn
              variant="text"
              prepend-icon="mdi-dots-horizontal-circle-outline"
              v-bind="menuProps"
              :disabled="recordActionButtonsDisabled"
            >
              <template v-if="mdAndUp">{{ t('global.more') }}</template>
            </v-btn>
          </template>

          <SaplingRecordActionMenuList
            class="glass-panel"
            density="comfortable"
            min-width="260"
            :menu-items="recordActionMenuItems"
            :show-edit="false"
            @select="emit('select-action', $event)"
          />
        </v-menu>

        <v-btn
          v-if="canDeleteRecord"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-outline"
          :disabled="recordActionButtonsDisabled"
          @click="emit('delete')"
        >
          <template v-if="mdAndUp">{{ t('global.delete') }}</template>
        </v-btn>

        <v-btn
          variant="text"
          prepend-icon="mdi-restore"
          :disabled="!isDirty || isSaving"
          @click="emit('reset')"
        >
          <template v-if="mdAndUp">{{ resetButtonLabel }}</template>
        </v-btn>
        <v-btn
          color="primary"
          append-icon="mdi-content-save"
          :disabled="!isDirty || isSaving"
          :loading="pendingSaveAction === 'save'"
          @click="emit('save')"
        >
          <template v-if="mdAndUp">{{ t('global.save') }}</template>
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          append-icon="mdi-content-save-check"
          :disabled="!isDirty || isSaving"
          :loading="pendingSaveAction === 'saveAndClose'"
          @click="emit('save-and-close')"
        >
          <template v-if="mdAndUp">{{ t('global.saveAndClose') }}</template>
        </v-btn>
      </template>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import type { DialogSaveAction, DialogState } from '@/entity/structure'
import type {
  SaplingContextMenuTableMenuEntry,
  SaplingContextMenuTableMenuItem,
} from '@/composables/context/useSaplingContextMenuTable'
import SaplingRecordActionMenuList from '@/components/common/SaplingRecordActionMenuList.vue'
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'
import SaplingActionBarSkeleton from '@/components/actions/SaplingActionBarSkeleton.vue'

defineProps<{
  mode: DialogState
  isLoading: boolean
  isDirty: boolean
  isSaving: boolean
  pendingSaveAction: DialogSaveAction | null
  canDeleteRecord: boolean
  recordActionButtonsDisabled: boolean
  editMobileSecondaryActionsDisabled: boolean
  hasReadonlyMobileActionMenu: boolean
  recordActionMenuItems: SaplingContextMenuTableMenuEntry[]
  mobileRecordActionMenuGroups: SaplingContextMenuTableMenuItem[][]
  resetButtonLabel: string
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'delete'): void
  (event: 'reset'): void
  (event: 'save'): void
  (event: 'save-and-close'): void
  (event: 'select-action', menuItem: SaplingContextMenuTableMenuItem): void
}>()

const { t, te } = useI18n()
const { mdAndUp, smAndDown } = useDisplay()

function resolveRecordActionMenuTitle(menuItem: SaplingContextMenuTableMenuItem): string {
  if (menuItem.titleKey) {
    return t(menuItem.titleKey)
  }

  if (!menuItem.title) {
    return ''
  }

  return te(menuItem.title) ? t(menuItem.title) : menuItem.title
}

function getMobileRecordActionKey(
  menuItem: SaplingContextMenuTableMenuItem,
  groupIdx: number,
  itemIdx: number,
): string {
  return `${groupIdx}-${itemIdx}-${menuItem.type}-${String(
    menuItem.scriptButton?.handle ??
      menuItem.scriptButton?.name ??
      menuItem.mailAction?.email ??
      menuItem.titleKey ??
      menuItem.title ??
      '',
  )}`
}
</script>
