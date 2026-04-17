<template>
  <v-container class="sapling-scrollable" fluid>
    <v-row class="fill-height" density="compact">
      <v-col cols="12" class="d-flex flex-column">
        <template v-if="isLoading">
          <v-skeleton-loader class="sapling-note-tabs-skeleton" type="heading" />
          <v-row class="pa-2" density="compact">
            <v-col v-for="item in 4" :key="item" cols="12" sm="6" md="4" lg="3">
              <v-skeleton-loader
                class="sapling-note-card-skeleton glass-panel"
                elevation="12"
                type="article, actions"
              />
            </v-col>
          </v-row>
        </template>
        <template v-else>
          <v-tabs v-model="selectedTab" grow background-color="primary" dark height="44">
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
                  <SaplingNoteCard
                    :note="note"
                    :group-handle="group.handle"
                    :allow-update="Boolean(entityPermission?.allowUpdate)"
                    :allow-delete="Boolean(entityPermission?.allowDelete)"
                    @edit="openEditDialog"
                    @delete="openDeleteDialog"
                  />
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
        </template>
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
      @update:mode="updateEditDialogMode"
      @update:item="updateEditDialogItem"
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

<script lang="ts" setup>
// #region Imports
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingNoteCard from '@/components/note/SaplingNoteCard.vue'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import { useSaplingNote } from '@/composables/note/useSaplingNote'
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
  updateEditDialogMode,
  updateEditDialogItem,
  closeEditDialog,
  saveNoteDialog,
  openDeleteDialog,
  updateDeleteDialogVisibility,
  closeDeleteDialog,
  confirmDeleteNote,
} = useSaplingNote()
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingNote.css"></style>
