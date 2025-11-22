<template>
  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height glass-panel"
    elevation="12"
    width="100%"
    type="article, actions, card"/>
  <template v-else>
    <v-container class="fill-height pa-0" fluid>
      <v-row class="fill-height" no-gutters>
        <v-col cols="12" class="d-flex flex-column">
          <v-tabs :model-value="selectedTab" @update:model-value="val => emit('update:selectedTab', val)" grow background-color="primary" dark height="44">
            <v-tab v-for="(group, idx) in groups" :key="group.handle ?? idx" :value="idx" >
              <v-icon class="pr-4" v-if="group.icon" left>{{ group.icon }}</v-icon>
              {{ $t(`noteGroup.${group.handle}`) }}
            </v-tab>
          </v-tabs>
          <v-window :model-value="selectedTab" class="flex-grow-1">
            <v-window-item
              v-for="(group, idx) in groups"
              :key="group.handle ?? idx"
              :value="idx"
            >
              <v-row class="pa-4" dense>
                <v-col
                  v-for="note in currentNotes"
                  :key="note.handle ?? note.title"
                  cols="12" sm="12" md="6" lg="4">
                  <v-card class="sapling-note-card glass-panel tilt-content" v-tilt="{ max: 5, scale: 1.05 }" outlined>
                    <v-card-title class="d-flex justify-space-between align-center">
                      <span>{{ note.title }}</span>
                      <v-btn-group>
                        <v-btn v-if="entityPermission?.allowUpdate" icon size="small" class="glass-panel" @click="openEditDialog(note)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn v-if="entityPermission?.allowDelete" icon size="small" class="glass-panel" @click="deleteNote(note)"><v-icon>mdi-delete</v-icon></v-btn>
                      </v-btn-group>
                    </v-card-title>
                    <v-card-text>
                      <div class="sapling-note-description">{{ note.description }}</div>
                    </v-card-text>
                    <v-card-subtitle class="text-caption text-right">
                      {{ note.createdAt ? $d(new Date(note.createdAt)) : '' }}
                    </v-card-subtitle>
                  </v-card>
                </v-col>
                <!-- Add Note Button as Card -->
                <v-col v-if="entityPermission?.allowInsert" cols="12" sm="12" md="6" lg="4">
                  <v-card outlined class="sapling-add-kpi-card d-flex align-center justify-center glass-panel tilt-content" v-tilt="{ max: 5, scale: 1.05 }" @click="openCreateDialog">
                    <v-icon size="large" color="primary">mdi-plus-circle</v-icon>
                    <v-btn color="primary" variant="text" class="ma-2">
                    {{ $t('global.add') }}
                    </v-btn>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-col>
      </v-row>
      <SaplingEdit
        :model-value="editDialog.visible"
        :mode="editDialog.mode"
        :item="editDialog.item ? { ...editDialog.item } : null"
        :templates="entityTemplates"
        :entity="entity"
        :showReference="false"
        @update:model-value="val => editDialog.visible = val"
        @save="saveNoteDialog"
        @cancel="closeEditDialog" />
      <SaplingDelete
        :model-value="deleteDialog.visible"
        :item="deleteDialog.item ? { ...deleteDialog.item } : null"
        @update:model-value="val => deleteDialog.visible = val"
        @confirm="confirmDeleteNote"
        @cancel="closeDeleteDialog" />
    </v-container>
  </template>
</template>

<script lang="ts" setup>
// #region Imports
import { toRefs } from 'vue'; // Vue composition API
import SaplingEdit from '@/components/dialog/SaplingEdit.vue'; // Edit dialog component
import SaplingDelete from '@/components/dialog/SaplingDelete.vue'; // Delete dialog component
import type { EntityItem, NoteGroupItem, NoteItem } from '@/entity/entity'; // Entity types
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'; // Template type
import '@/assets/styles/SaplingNote.css'; // Styles
// #endregion Imports

// #region Props and Emits
const props = defineProps<{
  groups: NoteGroupItem[],
  selectedTab: number,
  currentNotes: NoteItem[],
  editDialog: { visible: boolean; mode: 'create' | 'edit'; item: NoteItem | null },
  deleteDialog: { visible: boolean; item: NoteItem | null },
  isLoading: boolean,
  entity: EntityItem | null,
  entityPermission: AccumulatedPermission | null,
  entityTemplates: EntityTemplate[],
}>();


// Define component emits
const emit = defineEmits([
  'update:selectedTab',
  'open-create',
  'open-edit',
  'close-edit',
  'save-edit',
  'open-delete',
  'close-delete',
  'confirm-delete',
]);

// Destructure props for easier access
const { groups, selectedTab, currentNotes, editDialog, deleteDialog, entityTemplates } = toRefs(props);
// #endregion Props and Emits

// #region Methods
// Open the create note dialog
function openCreateDialog() {
  emit('open-create');
}

// Open the edit note dialog
function openEditDialog(note: NoteItem) {
  emit('open-edit', note);
}

// Close the edit note dialog
function closeEditDialog() {
  emit('close-edit');
}

// Save the note from the dialog
function saveNoteDialog(item: { title: string; description: string }) {
  emit('save-edit', item);
}

// Open the delete note dialog
function deleteNote(note: NoteItem) {
  emit('open-delete', note);
}

// Close the delete note dialog
function closeDeleteDialog() {
  emit('close-delete');
}

// Confirm deletion of the note
function confirmDeleteNote() {
  emit('confirm-delete');
}
// #endregion Methods

</script>
