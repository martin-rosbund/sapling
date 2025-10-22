<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height" no-gutters>
      <v-col cols="12" class="d-flex flex-column">
        <v-tabs :model-value="selectedTab" @update:model-value="val => emit('update:selectedTab', val)" grow background-color="primary" dark height="44">
          <v-tab v-for="(group, idx) in groups" :key="group.handle ?? idx" :value="idx" >
            <v-icon v-if="group.icon" left>{{ group.icon }}</v-icon>
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
                cols="12" sm="6" md="4" lg="3"
              >
                <v-card class="note-card" outlined>
                  <v-card-title class="d-flex justify-space-between align-center">
                    <span>{{ note.title }}</span>
                    <v-btn-group>
                      <v-btn icon size="small" @click="openEditDialog(note)"><v-icon>mdi-pencil</v-icon></v-btn>
                      <v-btn icon size="small" @click="deleteNote(note)"><v-icon>mdi-delete</v-icon></v-btn>
                    </v-btn-group>
                  </v-card-title>
                  <v-card-text>
                    <div style="white-space: pre-line;">{{ note.description }}</div>
                  </v-card-text>
                  <v-card-subtitle class="text-caption text-right">
                    {{ note.createdAt ? $d(new Date(note.createdAt)) : '' }}
                  </v-card-subtitle>
                </v-card>
              </v-col>
              <!-- Add Note Button as Card -->
              <v-col cols="12" sm="6" md="4" lg="3">
                <v-card outlined class="add-kpi-card d-flex align-center justify-center" @click="openCreateDialog">
                  <v-icon size="large">mdi-plus-circle</v-icon>
                  <span class="ml-2">Notiz hinzufügen</span>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>
    <EntityEditDialog
      :model-value="editDialog.visible"
      :mode="editDialog.mode"
      :item="editDialog.item ? { ...editDialog.item } : null"
      :templates="templates"
      :entity="entity"
      :showReference="false"
      @update:model-value="val => editDialog.visible = val"
      @save="saveNoteDialog"
      @cancel="closeEditDialog"
    />
    <EntityDeleteDialog
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item ? { ...deleteDialog.item } : null"
      @update:model-value="val => deleteDialog.visible = val"
      @confirm="confirmDeleteNote"
      @cancel="closeDeleteDialog"
    />
  </v-container>
</template>

<script lang="ts" setup>

import { toRefs } from 'vue';
import EntityEditDialog from '@/components/entity/EntityEditDialog.vue';
import EntityDeleteDialog from '@/components/entity/EntityDeleteDialog.vue';
import type { EntityItem, NoteGroupItem, NoteItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';

const props = defineProps<{
  groups: NoteGroupItem[],
  selectedTab: number,
  currentNotes: NoteItem[],
  editDialog: { visible: boolean; mode: 'create' | 'edit'; item: NoteItem | null },
  deleteDialog: { visible: boolean; item: NoteItem | null },
  templates: EntityTemplate[],
  isLoading: boolean,
  entity: EntityItem | null,
}>();

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

const { groups, selectedTab, currentNotes, editDialog, deleteDialog, templates } = toRefs(props);

function openCreateDialog() {
  emit('open-create');
}
function openEditDialog(note: NoteItem) {
  emit('open-edit', note);
}
function closeEditDialog() {
  emit('close-edit');
}
function saveNoteDialog(item: { title: string; description: string }) {
  emit('save-edit', item);
}
function deleteNote(note: NoteItem) {
  emit('open-delete', note);
}
function closeDeleteDialog() {
  emit('close-delete');
}
function confirmDeleteNote() {
  emit('confirm-delete');
}
</script>

<style scoped>
.note-card {
  height: 200px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.note-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.add-kpi-card {
  height: 200px;
  border-style: dashed;
  color: #1976d2;
  cursor: pointer;
  transition: 0.2s;
}
.add-kpi-card:hover {
  background: #e0e0e01a;
}
.v-slide-group {
  max-height: 44px !important;
}
</style>
