<template>
  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height"
    elevation="12"
    width="100%"
    type="article, actions, card"
  />
  <template v-else>
    <v-container class="sapling-scrollable" fluid>
      <v-row class="fill-height" density="compact">
        <v-col cols="12" class="d-flex flex-column">
          <v-tabs
            v-model="selectedTab"
            grow
            background-color="primary"
            dark
            height="44"
          >
            <v-tab
              v-for="(group, groupIndex) in groups"
              :key="String(group.handle ?? groupIndex)"
              :value="groupIndex"
            >
              <v-icon v-if="group.icon" class="pr-4" left>{{ group.icon }}</v-icon>
              {{ $t(`noteGroup.${group.handle}`) }}
            </v-tab>
          </v-tabs>

          <v-window v-model="selectedTab" class="flex-grow-1">
            <v-window-item
              v-for="(group, groupIndex) in groups"
              :key="String(group.handle ?? groupIndex)"
              :value="groupIndex"
            >
              <v-row class="pa-2" density="compact">
                <v-col
                  v-for="note in currentNotes"
                  :key="String(note.handle ?? note.title)"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                >
                  <v-card
                    class="sapling-note-card glass-panel tilt-content"
                    v-tilt="TILT_DEFAULT_OPTIONS"
                    outlined
                  >
                    <div class="sapling-note-card__content">
                      <v-card-title class="d-flex justify-space-between align-center">
                        <span>{{ note.title }}</span>
                        <v-btn-group density="compact" class="sapling-note-card__actions">
                          <v-btn
                            v-if="entityPermission?.allowUpdate"
                            class="sapling-note-card__action"
                            variant="text"
                            @click="openEditDialog(note)"
                          >
                              <v-icon size="x-small">mdi-pencil</v-icon>
                          </v-btn>
                          <v-btn
                            v-if="entityPermission?.allowDelete"
                            class="sapling-note-card__action"
                            variant="text"
                            @click="openDeleteDialog(note)"
                          >
                              <v-icon size="x-small">mdi-delete</v-icon>
                          </v-btn>
                        </v-btn-group>
                      </v-card-title>
                      <v-card-text>
                        <div class="sapling-note-description">{{ note.description }}</div>
                      </v-card-text>
                      <v-card-subtitle class="sapling-note-card__timestamp text-caption text-right">
                          {{ note.createdAt ? $d(new Date(note.createdAt)) : '' }}
                      </v-card-subtitle>
                    </div>
                  </v-card>
                </v-col>

                <v-col
                  v-if="entityPermission?.allowInsert && currentGroup"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                >
                  <v-card
                    outlined
                    class="sapling-add-note-card d-flex align-center justify-center glass-panel tilt-content"
                    v-tilt="TILT_DEFAULT_OPTIONS"
                    @click="openCreateDialog"
                  >
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
      <SaplingDialogEdit
        :model-value="editDialog.visible"
        :mode="editDialog.mode"
        :item="editDialogItem"
        :templates="entityTemplates"
        :entity="entity"
        :showReference="false"
        @update:model-value="updateEditDialogVisibility"
        @save="saveNoteDialog"
        @cancel="closeEditDialog"
      />
      <SaplingDialogDelete
        :model-value="deleteDialog.visible"
        :item="deleteDialogItem"
        @update:model-value="updateDeleteDialogVisibility"
        @confirm="confirmDeleteNote"
        @cancel="closeDeleteDialog"
      />
    </v-container>
  </template>
</template>

<script lang="ts" setup>
// #region Imports
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import { useSaplingNote } from '@/composables/note/useSaplingNote';
// #endregion

// #region Composable
const {
  groups,
  selectedTab,
  currentGroup,
  currentNotes,
  editDialog,
  editDialogItem,
  deleteDialog,
  deleteDialogItem,
  entityTemplates,
  isLoading,
  entity,
  entityPermission,
  openCreateDialog,
  openEditDialog,
  updateEditDialogVisibility,
  closeEditDialog,
  saveNoteDialog,
  openDeleteDialog,
  updateDeleteDialogVisibility,
  closeDeleteDialog,
  confirmDeleteNote,
} = useSaplingNote();
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingNote.css"></style>
