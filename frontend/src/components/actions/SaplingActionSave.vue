<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" :disabled="busy" @click="cancel">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn
        v-if="reset"
        variant="text"
        prepend-icon="mdi-restore"
        :disabled="resetDisabled || busy"
        @click="reset"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ resetLabel }}</template>
      </v-btn>
      <v-btn
        color="primary"
        append-icon="mdi-content-save"
        :disabled="saveDisabled || busy"
        :loading="saveLoading"
        @click="save"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.save') }}</template>
      </v-btn>
      <v-btn
        v-if="saveAndClose"
        color="primary"
        variant="tonal"
        append-icon="mdi-content-save-check"
        :disabled="saveDisabled || busy"
        :loading="saveAndCloseLoading"
        @click="saveAndClose"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.saveAndClose') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

withDefaults(
  defineProps<{
    cancel: () => void
    save: () => void | Promise<void>
    saveAndClose?: () => void | Promise<void>
    reset?: () => void
    saveDisabled?: boolean
    resetDisabled?: boolean
    resetLabel?: string
    saveLoading?: boolean
    saveAndCloseLoading?: boolean
    busy?: boolean
  }>(),
  {
    reset: undefined,
    saveAndClose: undefined,
    saveDisabled: false,
    resetDisabled: false,
    resetLabel: 'Reset',
    saveLoading: false,
    saveAndCloseLoading: false,
    busy: false,
  },
)
</script>
