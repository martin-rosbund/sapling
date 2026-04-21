<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn
        v-if="props.allowCancel"
        color="default"
        prepend-icon="mdi-close"
        variant="text"
        @click="props.closeDialog"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn color="primary" append-icon="mdi-lock-reset" @click="props.handlePasswordChange">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('login.changePassword') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script setup lang="ts">
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

const props = withDefaults(
  defineProps<{
    allowCancel?: boolean
    handlePasswordChange: () => void | Promise<void>
    closeDialog: () => void
  }>(),
  {
    allowCancel: true,
  },
)
</script>
