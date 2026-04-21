<template>
  <!-- Application header bar with navigation and actions -->
  <v-app-bar :elevation="2" class="sapling-header">
    <template #prepend>
      <!-- Navigation drawer toggle button -->
      <v-app-bar-nav-icon @click="toggleNavigation"></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <div class="sapling-inline-cluster sapling-inline-cluster--wide sapling-header__brand">
        <!-- Home button -->
        <v-btn stacked @click="goHome">Sapling</v-btn>
      </div>
    </v-app-bar-title>

    <template #append>
      <!-- Current time display -->
      <template v-if="$vuetify.display.mdAndUp">
        <span class="sapling-header__time">{{ time }}</span>
      </template>

      <SaplingMessageCenter ref="messageCenterRef" />

      <!-- Message center button with badge -->
      <v-btn class="text-none" stacked @click="openMessageCenter">
        <v-badge
          location="top right"
          color="primary"
          :content="messageCount"
          :value="messageCount > 0"
        >
          <v-icon icon="mdi-cloud-alert"></v-icon>
        </v-badge>
      </v-btn>

      <!-- Inbox button with badge -->
      <v-btn class="text-none" stacked @click="openInbox">
        <v-badge location="top right" color="primary" :content="inboxCount">
          <v-icon icon="mdi-email"></v-icon>
        </v-badge>
      </v-btn>

      <!-- Account button -->
      <v-btn stacked @click="openAccount">
        <div class="sapling-header__account">
          <v-icon icon="mdi-account"></v-icon>
          <div class="sapling-header__account-name">{{ currentPersonStore.person?.firstName }}</div>
        </div>
      </v-btn>
    </template>
  </v-app-bar>

  <!-- Inbox dialog -->
  <SaplingInbox v-if="showInbox" @close="closeInbox" />

  <!-- Account dialog -->
  <SaplingAccount v-if="showAccount" @close="closeAccount" />
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref } from 'vue'
import { useSaplingHeader } from '@/composables/system/useSaplingHeader'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import SaplingInbox from '@/components/account/SaplingInbox.vue'
import SaplingAccount from '@/components/account/SaplingAccount.vue'
import SaplingMessageCenter from '@/components/system/SaplingMessageCenter.vue'
// #endregion

interface SaplingMessageCenterExposed {
  openDialog: () => void
}

const messageCenterRef = ref<SaplingMessageCenterExposed | null>(null)

// #region Props
const props = withDefaults(
  defineProps<{
    modelValue?: boolean
  }>(),
  {
    modelValue: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
// #endregion

const { messages } = useSaplingMessageCenter()
const messageCount = computed(() => messages.value.length)

function toggleNavigation() {
  emit('update:modelValue', !props.modelValue)
}

function openMessageCenter() {
  messageCenterRef.value?.openDialog()
}

// #region Composable
const {
  showInbox,
  showAccount,
  inboxCount,
  time,
  currentPersonStore,
  openInbox,
  closeInbox,
  openAccount,
  closeAccount,
  goHome,
} = useSaplingHeader()
// #endregion
</script>
