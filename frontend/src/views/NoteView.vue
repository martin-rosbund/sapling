
<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      width="100%"
      height="100%"
      type="article, actions, card"/>
    <template v-else>
      <NoteTable
        :groups="groups"
        :selectedTab="selectedTab"
        :currentNotes="currentNotes"
        :editDialog="editDialog"
        :deleteDialog="deleteDialog"
        :templates="templates"
        :isLoading="isLoading"
        :entity="entity"
        @update:selectedTab="val => selectedTab = val"
        @open-create="openCreateDialog"
        @open-edit="openEditDialog"
        @close-edit="closeEditDialog"
        @save-edit="saveNoteDialog"
        @open-delete="deleteNote"
        @close-delete="closeDeleteDialog"
        @confirm-delete="confirmDeleteNote"
      />
    </template>
    
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import NoteTable from '@/components/note/NoteTable.vue';

// Composables
import { useNoteTable } from '@/composables/useNoteTable';

export default defineComponent({
  components: { SaplingHeader, SaplingFooter, NoteTable },
  setup() {
    const {
      groups,
      selectedTab,
      currentNotes,
      editDialog,
      deleteDialog,
      templates,
      isLoading,
      entity,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      saveNoteDialog,
      deleteNote,
      closeDeleteDialog,
      confirmDeleteNote,
    } = useNoteTable();
    return {
      groups,
      selectedTab,
      currentNotes,
      editDialog,
      deleteDialog,
      templates,
      isLoading,
      entity,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      saveNoteDialog,
      deleteNote,
      closeDeleteDialog,
      confirmDeleteNote,
    };
  },
});
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