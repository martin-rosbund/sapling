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
      <div
        class="sapling-footer__actions"
        :class="{ 'sapling-footer__actions--compact': !showActionsInline }"
      >
        <template v-if="showActionsInline">
          <v-btn-group>
            <v-btn
              v-for="action in footerActions"
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
          </v-btn-group>
        </template>
        <template v-else>
          <v-menu location="top right" offset-y>
            <template #activator="{ props }">
              <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
            </template>
            <v-list class="glass-panel">
              <v-list-item
                v-for="action in footerActions"
                :key="action.key"
                @click="action.handler"
              >
                <v-list-item-title>{{ action.label }}</v-list-item-title>
                <template #prepend><v-icon>{{ action.icon }}</v-icon></template>
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
      </div>
    </template>
    <template v-else>
      <div class="sapling-footer-skeleton sapling-footer__actions mx-2">
        <v-skeleton-loader
          v-for="index in skeletonActionCount"
          :key="index"
          type="button"
          class="sapling-footer-skeleton__item"
        />
      </div>
    </template>

    <v-btn
      v-if="hasSaplingAiChatAccess"
      class="sapling-footer__ai-fab"
      color="primary"
      icon="mdi-robot-happy-outline"
      size="large"
      elevation="12"
      @click="toggleSaplingAiChat"
    />
  </v-footer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { useSaplingFooter } from '@/composables/system/useSaplingFooter'

const {
  currentLanguage,
  languageOptions,
  showActionsInline,
  footerActions,
  appearanceActions,
  footerActionCount,
  appearanceActionCount,
  setLanguage,
  isLoading,
} = useSaplingFooter()

const { toggleSaplingAiChat, hasSaplingAiChatAccess } = useSaplingAiChat()
const skeletonActionCount = computed(() => footerActionCount.value + appearanceActionCount.value)
</script>
