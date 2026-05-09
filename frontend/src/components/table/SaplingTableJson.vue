<template>
  <div>
    <v-btn
      size="small"
      class="glass-panel"
      :rounded="false"
      :max-height="32"
      @click.stop="openJsonDialog()"
    >
      <v-icon class="pr-3" left>mdi-code-json</v-icon>
      {{ $t(`global.show`) }}
    </v-btn>
    <v-dialog
      v-model:modelValue="isDialogOpen"
      :max-width="SAPLING_DIALOG_MAX_WIDTH.xxl"
      :height="SAPLING_DIALOG_HEIGHT.xl"
      persistent
    >
      <SaplingDialogCard class="sapling-dialog-json-card sapling-dialog-card--fullscreen">
        <div class="sapling-dialog-shell sapling-fill-shell">
          <v-card-title class="sapling-dialog-json-title">{{ $t(dialogTitleKey) }}</v-card-title>
          <v-card-text class="sapling-dialog-json-content">
            <div class="sapling-dialog-json-body">
              <SaplingCodeMirror
                v-model="formattedJson"
                language="json"
                :theme="editorTheme"
                read-only
                class="sapling-dialog-json-editor"
              />
            </div>
          </v-card-text>
        </div>
        <SaplingActionClose :close="closeJsonDialog" />
      </SaplingDialogCard>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import SaplingCodeMirror from '@/components/common/SaplingCodeMirror.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import {
  useSaplingTableJson,
  type UseSaplingTableJsonProps,
} from '@/composables/table/useSaplingTableJson'
import SaplingActionClose from '../actions/SaplingActionClose.vue'
import { SAPLING_DIALOG_MAX_WIDTH, SAPLING_DIALOG_HEIGHT } from '@/constants/dialog.constants'

const props = defineProps<UseSaplingTableJsonProps>()

const {
  isDialogOpen,
  openJsonDialog,
  closeJsonDialog,
  formattedJson,
  dialogTitleKey,
  editorTheme,
} = useSaplingTableJson(props)
</script>
