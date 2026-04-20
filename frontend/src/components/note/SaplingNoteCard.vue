<template>
  <v-card class="sapling-note-card glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" outlined>
    <div class="sapling-note-card__header">
      <div class="sapling-note-card__headline">
        <div class="sapling-note-card__meta-row">
          <v-chip v-if="groupLabel" size="small" variant="tonal" color="primary">
            {{ groupLabel }}
          </v-chip>
          <span v-if="createdAtLabel" class="sapling-note-card__date">
            {{ createdAtLabel }}
          </span>
        </div>

        <h3 class="sapling-note-card__title" :title="note.title">
          {{ note.title }}
        </h3>
      </div>

      <v-btn-group
        v-if="allowUpdate || allowDelete"
        density="compact"
        class="sapling-note-card__actions"
      >
        <v-btn
          v-if="allowUpdate"
          class="sapling-note-card__action"
          variant="text"
          :title="t('global.edit')"
          @click.stop="emit('edit', note)"
        >
          <v-icon size="small">mdi-pencil</v-icon>
        </v-btn>
        <v-btn
          v-if="allowDelete"
          class="sapling-note-card__action"
          variant="text"
          :title="t('global.delete')"
          @click.stop="emit('delete', note)"
        >
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </v-btn-group>
    </div>

    <div class="sapling-note-card__body">
      <p v-if="note.description" class="sapling-note-card__description">
        {{ note.description }}
      </p>
      <div v-else class="sapling-note-card__empty">
        <v-icon size="18">mdi-note-text-outline</v-icon>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
// #region Imports
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import type { NoteItem } from '@/entity/entity'
// #endregion

/**
 * Props for a single note tile.
 */
export interface SaplingNoteCardProps {
  note: NoteItem
  groupHandle?: string | null
  allowUpdate?: boolean
  allowDelete?: boolean
}

const props = withDefaults(defineProps<SaplingNoteCardProps>(), {
  groupHandle: null,
  allowUpdate: false,
  allowDelete: false,
})

const emit = defineEmits<{
  edit: [note: NoteItem]
  delete: [note: NoteItem]
}>()

const { t, d } = useI18n()

const groupLabel = computed(() => {
  if (!props.groupHandle) {
    return ''
  }

  return t(`noteGroup.${props.groupHandle}`)
})

const createdAtLabel = computed(() => {
  if (!props.note.createdAt) {
    return ''
  }

  return d(new Date(props.note.createdAt))
})
</script>

<style scoped src="@/assets/styles/SaplingNoteCard.css"></style>
