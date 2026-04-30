<template>
  <v-footer class="sapling-footer glass-panel">
    <v-btn-toggle divided mandatory :model-value="currentLanguage" variant="text">
      <v-btn
        v-for="language in languageOptions"
        :key="language.key"
        size="x-small"
        :value="language.key"
        @click="setLanguage(language.key)"
      >
        {{ language.label }}
      </v-btn>
    </v-btn-toggle>

    <v-spacer></v-spacer>
    <v-spacer></v-spacer>

    <template v-if="!isLoading">
      <template v-if="showActionsInline">
        <v-btn
          v-for="action in externalActions"
          :key="action.key"
          :icon="action.icon"
          @click="action.handler"
          variant="text"
          size="small"
        />
        <v-btn
          v-for="action in appearanceActions"
          :key="action.key"
          :icon="action.icon"
          :color="action.isActive ? 'primary' : undefined"
          @click="action.handler"
          variant="text"
          size="small"
        />
      </template>
      <template v-else>
        <v-menu location="top right" offset-y>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
          </template>
          <v-list class="glass-panel">
            <v-list-item
              v-for="action in externalActions"
              :key="action.key"
              @click="action.handler"
            >
              <v-list-item-title>{{ action.label }}</v-list-item-title>
              <template #prepend
                ><v-icon>{{ action.icon }}</v-icon></template
              >
            </v-list-item>
            <v-list-item
              v-for="action in appearanceActions"
              :key="action.key"
              @click="action.handler"
            >
              <v-list-item-title>{{ action.label }}</v-list-item-title>
              <template #prepend>
                <v-icon :color="action.isActive ? 'primary' : undefined">{{ action.icon }}</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </template>
    <template v-else>
      <div class="sapling-footer-skeleton mx-2">
        <v-skeleton-loader
          v-for="index in skeletonActionCount"
          :key="index"
          type="button"
          class="sapling-footer-skeleton__item"
        />
      </div>
    </template>
  </v-footer>
</template>

<script lang="ts" setup>
import { computed, onUnmounted, ref } from 'vue'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import { i18n } from '@/i18n'
import { useSaplingPreferences } from '@/composables/system/useSaplingPreferences'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'

interface FooterAction {
  key: string
  icon: string
  label: string
  handler: () => void | Promise<void>
  isActive?: boolean
}

const currentPersonStore = useCurrentPersonStore()
const { currentLanguage, languageOptions, appearanceActions, setLanguage, isLoading } =
  useSaplingPreferences()
const windowWatcher = new SaplingWindowWatcher()
const showActionsInline = ref(windowWatcher.getCurrentSize() !== 'small')
const stopWatchingWindowSize = windowWatcher.onChange((size) => {
  showActionsInline.value = size !== 'small'
})

const hasAdministratorRole = computed(
  () =>
    currentPersonStore.person?.roles?.some((role) => {
      if (!role || typeof role === 'string') {
        return false
      }

      return role.isAdministrator === true
    }) ?? false,
)

const externalActions = computed<FooterAction[]>(() => {
  if (isLoading.value || !hasAdministratorRole.value) {
    return []
  }

  return [
    {
      key: 'swagger',
      icon: 'mdi-api',
      label: i18n.global.t('global.swagger'),
      handler: openSwagger,
    },
    {
      key: 'git',
      icon: 'mdi-git',
      label: i18n.global.t('global.git'),
      handler: openGit,
    },
  ]
})

const skeletonActionCount = computed(
  () => externalActions.value.length + appearanceActions.value.length,
)

onUnmounted(() => {
  stopWatchingWindowSize()
  windowWatcher.destroy()
})

function openSwagger() {
  window.open(`${BACKEND_URL}swagger`, '_blank')
}

function openGit() {
  window.open(GIT_URL, '_blank')
}
</script>
