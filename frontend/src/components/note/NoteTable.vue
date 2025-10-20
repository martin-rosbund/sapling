<template>
  <v-card class="my-4 pa-4 d-flex flex-column" style="width: 100%;">
    <v-row class="align-center mb-2" no-gutters>
      <v-col cols="auto" class="flex-grow-1 pr-0">
        <v-tabs :model-value="selectedTab" @update:model-value="val => emit('update:selectedTab', val)" grow height="40">
          <v-tab v-for="(group, idx) in groups" :key="group.handle ?? idx" :value="idx" style="min-width: 120px; padding: 0 12px; font-size: 1rem;">
            {{ $t(`noteGroup.${group.handle}`) }}
          </v-tab>
        </v-tabs>
      </v-col>
      <v-col cols="auto" class="pl-0">
        <v-btn-group>
          <v-btn color="primary" icon size="small" @click="openCreateDialog"><v-icon>mdi-plus</v-icon></v-btn>
        </v-btn-group>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-item-group>
          <v-row>
            <v-col v-for="note in currentNotes" :key="note.handle ?? note.title" cols="12" sm="6" md="4" lg="3">
              <v-card class="note-card" elevation="4">
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
          </v-row>
        </v-item-group>
      </v-col>
    </v-row>
    <EntityEditDialog
      :model-value="editDialog.visible"
      :mode="editDialog.mode"
      :item="editDialog.item"
      :templates="templates"
      :entity="entity"
      @update:model-value="val => editDialog.visible = val"
      @save="saveNoteDialog"
      @cancel="closeEditDialog"
    />
    <EntityDeleteDialog
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="val => deleteDialog.visible = val"
      @confirm="confirmDeleteNote"
      @cancel="closeDeleteDialog"
    />
  </v-card>
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
  border-radius: 12px;
  height: 200px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
}
.note-card:hover {
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.16);
}
.note-card {
  max-height: 340px;
  display: flex;
  flex-direction: column;
}
.note-card .v-card-text {
  overflow-y: auto;
  max-height: 200px;
}
</style>
