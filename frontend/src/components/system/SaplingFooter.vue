<template>
  <!-- Footer with language and theme toggle buttons -->
  <v-footer app class="glass-panel sapling-footer">
    <!-- MessageCenter Button and Component -->
    <SaplingMessageCenter ref="messageCenterRef" />
    <!-- Button to toggle language, displays the current language flag -->
    <v-btn
      @click="toggleLanguage"
      variant="text">
      <v-img
        :src="currentLanguage === 'de' ? enFlag  : deFlag"
        width="24"
        height="24"
        cover/>
    </v-btn>
    <!-- Left spacer -->
    <v-spacer></v-spacer>
    <!-- Absolutely centered version text -->
    <div style="position: absolute; left: 0; right: 0; margin: auto; text-align: center; color: #888; pointer-events: none; width: 100%;">
      {{ version?.length > 0 ? `Version ${version}` : '' }}
    </div>
    <!-- Right spacer -->
    <v-spacer></v-spacer>
    <!-- Responsive: Show actions inline or in menu -->
    <template v-if="!isLoading">
      <template v-if="showActionsInline">
        <v-btn-group>
            <v-btn @click="openMessageCenter" stacked variant="text" v-tooltip="$t('global.messageCenter')">
              <v-badge location="top right" color="primary" :content="messageCount" :value="messageCount > 0">
                <v-icon icon="mdi-cloud-alert"></v-icon>
              </v-badge>
            </v-btn>
          <v-btn :icon="'mdi-bug'" @click="$router.push('/bug')" variant="text" v-tooltip="$t('global.bug')"></v-btn>
          <v-btn :icon="'mdi-poll'" @click="$router.push('/system')" variant="text" v-tooltip="$t('global.systemMonitor')"></v-btn>
          <v-btn :icon="'mdi-code-block-braces'" @click="$router.push('/playground')" variant="text" v-tooltip="$t('global.componentLibrary')"></v-btn>
          <v-btn :icon="'mdi-api'" @click="openSwagger" variant="text" v-tooltip="$t('global.swagger')"></v-btn>
          <v-btn :icon="'mdi-git'" @click="openGit" variant="text" v-tooltip="$t('global.git')"></v-btn>
          <v-btn :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" @click="toggleTheme" variant="text" v-tooltip="theme.global.current.value.dark ? $t('global.themeLight') : $t('global.themeDark')"></v-btn>
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
            <v-list-item @click="$router.push('/bug')">
              <v-list-item-title>{{ $t('global.bug') }}</v-list-item-title>
              <template #prepend><v-icon>mdi-bug</v-icon></template>
            </v-list-item> 
            <v-list-item @click="$router.push('/system')">
              <v-list-item-title>{{ $t('global.systemMonitor') }}</v-list-item-title>
              <template #prepend><v-icon>mdi-poll</v-icon></template>
            </v-list-item>
            <v-list-item @click="$router.push('/playground')">
              <v-list-item-title>{{ $t('global.componentLibrary') }}</v-list-item-title>
              <template #prepend><v-icon>mdi-code-block-braces</v-icon></template>
            </v-list-item>
            <v-list-item @click="openSwagger">
              <v-list-item-title>{{ $t('global.swagger') }}</v-list-item-title>
              <template #prepend><v-icon>mdi-api</v-icon></template>
            </v-list-item>
            <v-list-item @click="openGit">
              <v-list-item-title>{{ $t('global.git') }}</v-list-item-title>
              <template #prepend><v-icon>mdi-git</v-icon></template>
            </v-list-item>
            <v-list-item @click="toggleTheme">
              <v-list-item-title>{{ theme.global.current.value.dark ? $t('global.themeLight') : $t('global.themeDark') }}</v-list-item-title>
              <template #prepend>
                <v-icon>{{ theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
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
import { computed } from 'vue';
import { useMessageCenter } from '@/composables/system/useMessageCenter';
import { useSaplingFooter } from '@/composables/system/useSaplingFooter';
import SaplingMessageCenter from '@/components/system/SaplingMessageCenter.vue';
// #endregion

// #region Composable
import { ref } from 'vue';
const messageCenterRef = ref();
const {
  theme,
  currentLanguage,
  deFlag,
  enFlag,
  version,
  showActionsInline,
  toggleTheme,
  toggleLanguage,
  openSwagger,
  isLoading,
  openGit,
} = useSaplingFooter();

// Message count for badge
const { messages } = useMessageCenter();
const messageCount = computed(() => messages.value.length);

function openMessageCenter() {
  if (messageCenterRef.value && messageCenterRef.value.dialog !== undefined) {
    messageCenterRef.value.dialog = true;
  }
}
// #endregion

</script>