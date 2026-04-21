<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="handleCancel">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn color="error" append-icon="mdi-delete" @click="handleConfirm">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.delete') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

//#region Props and Emits
// Define the props for the component
defineProps<{
  handleCancel: () => void // Method to handle cancel action
  handleConfirm: () => void // Method to handle confirm action
}>()
//#endregion
</script>
