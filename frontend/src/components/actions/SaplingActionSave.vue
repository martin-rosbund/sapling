<template>
  <div class="sapling-dialog__footer">
    <v-card-actions class="sapling-dialog__actions">
      <v-btn text prepend-icon="mdi-close" @click="cancel">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
      <v-spacer />
      <v-btn color="primary" append-icon="mdi-content-save" @click="save">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.save') }}</template>
      </v-btn>
      <v-btn
        v-if="saveAndClose"
        color="primary"
        variant="tonal"
        append-icon="mdi-content-save-check"
        @click="saveAndClose"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.saveAndClose') }}</template>
      </v-btn>
    </v-card-actions>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  cancel: () => void
  save: () => void
  saveAndClose?: () => void
}>()
</script>
