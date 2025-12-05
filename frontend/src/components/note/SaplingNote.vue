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
          <v-tabs v-model="selectedTab" grow background-color="primary" dark height="44">
            <v-tab v-for="(group, idx) in groups" :key="group.handle ?? idx" :value="idx" >
              <v-icon class="pr-4" v-if="group.icon" left>{{ group.icon }}</v-icon>
              {{ $t(`noteGroup.${group.handle}`) }}
            </v-tab>
          </v-tabs>
          <v-window v-model="selectedTab" class="flex-grow-1">
            <v-window-item
              v-for="(group, idx) in groups"
              :key="group.handle ?? idx"
              :value="idx"
            >
              <v-row class="pa-4" dense>
                <!-- Add Note as Card -->
                <v-col
                  v-for="note in currentNotes"
                  :key="note.handle ?? note.title"
                  cols="12" sm="6" md="4" lg="3">
                  <v-card class="sapling-note-card glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" outlined>
                      <div style="position: relative; height: 100%;">
                        <v-card-title class="d-flex justify-space-between align-center">
                          <span>{{ note.title }}</span>
                          <v-btn-group>
                            <v-btn v-if="entityPermission?.allowUpdate" icon size="x-small" class="transparent" @click="openEditDialog(note)"><v-icon>mdi-pencil</v-icon></v-btn>
                            <v-btn v-if="entityPermission?.allowDelete" icon size="x-small" class="transparent" @click="deleteNote(note)"><v-icon>mdi-delete</v-icon></v-btn>
                          </v-btn-group>
                        </v-card-title>
                        <v-card-text>
                          <div class="sapling-note-description">{{ note.description }}</div>
                        </v-card-text>
                        <v-card-subtitle class="text-caption text-right" style="position: absolute; right: 0px; bottom: 12px; margin-bottom: 0;">
                          {{ note.createdAt ? $d(new Date(note.createdAt)) : '' }}
                        </v-card-subtitle>
                      </div>
                  </v-card>
                </v-col>
                <!-- Add Note Button as Card -->
                <v-col v-if="entityPermission?.allowInsert" cols="12" sm="6" md="4" lg="3">
                  <v-card outlined class="sapling-add-kpi-card d-flex align-center justify-center glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" @click="openCreateDialog">
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
import SaplingEdit from '@/components/dialog/SaplingEdit.vue'; // Edit dialog component
import SaplingDelete from '@/components/dialog/SaplingDelete.vue'; // Delete dialog component
import '@/assets/styles/SaplingNote.css'; // Styles
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import { useSaplingNote } from '@/composables/note/useSaplingNote';
// #endregion

// #region Props and Emits
// No custom emits needed for tab switching
// #endregion

// #region Composable

const {
    groups,
    selectedTab,
    currentNotes,
    editDialog,
    deleteDialog,
    entityTemplates,
    isLoading,
    entity,
    entityPermission,
    openCreateDialog,
    openEditDialog,
    closeEditDialog,
    saveNoteDialog,
    deleteNote,
    closeDeleteDialog,
    confirmDeleteNote,
} = useSaplingNote();
// #endregion
</script>
