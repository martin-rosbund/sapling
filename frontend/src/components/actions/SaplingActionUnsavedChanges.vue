<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn
        variant="text"
        prepend-icon="mdi-pencil"
        :disabled="busy"
        @click="keepEditing"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.keepEditing') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn
        variant="text"
        color="warning"
        prepend-icon="mdi-delete-outline"
        :disabled="busy"
        @click="discard"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.discardChanges') }}</template>
      </v-btn>
      <v-btn
        color="primary"
        append-icon="mdi-content-save-check"
        :disabled="busy"
        :loading="saveLoading"
        @click="saveAndClose"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.saveAndClose') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

// #region Props
defineProps<{
  keepEditing: () => void
  discard: () => void
  saveAndClose: () => void
  busy?: boolean
  saveLoading?: boolean
}>()
// #endregion
</script>
