<template>
  <!-- Footer with language and theme toggle buttons -->
  <v-footer app>
    <!-- Shared message center dialog -->
    <SaplingMessageCenter ref="messageCenterRef" />

    <!-- Language toggle -->
    <v-btn
      @click="toggleLanguage"
      variant="text"
    >
      <v-img
        :src="alternateLanguageFlag"
        width="24"
        height="24"
        cover
      />
    </v-btn>

    <!-- Left spacer -->
    <v-spacer></v-spacer>

    <!-- Version label -->
    <div style="position: absolute; left: 0; right: 0; margin: auto; text-align: center; color: #888; pointer-events: none; width: 100%;">
      {{ versionLabel }}
    </div>

    <!-- Right spacer -->
    <v-spacer></v-spacer>

    <!-- Responsive footer actions -->
    <template v-if="!isLoading">
      <template v-if="showActionsInline">
        <v-btn-group>
          <v-btn @click="openMessageCenter" stacked variant="text">
            <v-badge location="top right" color="primary" :content="messageCount" :value="messageCount > 0">
              <v-icon icon="mdi-cloud-alert"></v-icon>
            </v-badge>
          </v-btn>
          <v-btn
            v-for="action in footerActions"
            :key="action.key"
            :icon="action.icon"
            @click="action.handler"
            variant="text"
          />
          <v-btn :icon="themeAction.icon" @click="themeAction.handler" variant="text" />
        </v-btn-group>
      </template>
      <template v-else>
        <v-menu location="top right" offset-y>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
          </template>
          <v-list class="glass-panel">
            <v-list-item @click="openMessageCenter">
              <v-list-item-title>{{ $t('global.messageCenter') }}</v-list-item-title>
              <template #prepend>
                <v-badge location="top right" color="primary" :content="messageCount" :value="messageCount > 0">
                  <v-icon>mdi-cloud-alert</v-icon>
                </v-badge>
              </template>
            </v-list-item>
            <v-list-item
              v-for="action in footerActions"
              :key="action.key"
              @click="action.handler"
            >
              <v-list-item-title>{{ $t(action.labelKey) }}</v-list-item-title>
              <template #prepend><v-icon>{{ action.icon }}</v-icon></template>
            </v-list-item>
            <v-list-item @click="themeAction.handler">
              <v-list-item-title>{{ $t(themeAction.labelKey) }}</v-list-item-title>
              <template #prepend>
                <v-icon>{{ themeAction.icon }}</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </template>
    <template v-else>
      <v-skeleton-loader type="button, button, button, button, button, button, button" class="mx-2" />
    </template>
  </v-footer>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref } from 'vue';
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter';
import { useSaplingFooter } from '@/composables/system/useSaplingFooter';
import SaplingMessageCenter from '@/components/system/SaplingMessageCenter.vue';
// #endregion

// #region Composable
interface SaplingMessageCenterExposed {
  openDialog: () => void;
}

const messageCenterRef = ref<SaplingMessageCenterExposed | null>(null);

const {
  alternateLanguageFlag,
  versionLabel,
  showActionsInline,
  footerActions,
  themeAction,
  toggleLanguage,
  isLoading,
  openMessageCenter,
} = useSaplingFooter({
  openMessageCenter: () => messageCenterRef.value?.openDialog(),
});

const { messages } = useSaplingMessageCenter();
const messageCount = computed(() => messages.value.length);
// #endregion

</script>