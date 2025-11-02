
<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <SaplingNote
      :groups="groups"
      :selectedTab="selectedTab"
      :currentNotes="currentNotes"
      :editDialog="editDialog"
      :deleteDialog="deleteDialog"
      :templates="templates"
      :isLoading="isLoading"
      :entity="entity"
      :ownPermission="ownPermission"
      @update:selectedTab="val => selectedTab = val"
      @open-create="openCreateDialog"
      @open-edit="openEditDialog"
      @close-edit="closeEditDialog"
      @save-edit="saveNoteDialog"
      @open-delete="deleteNote"
      @close-delete="closeDeleteDialog"
      @confirm-delete="confirmDeleteNote"
    />
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';

// Composables
import { useSaplingNote } from '@/composables/note/useSaplingNote';
import SaplingNote from '@/components/note/SaplingNote.vue';

export default defineComponent({
  components: { SaplingHeader, SaplingFooter, SaplingNote },
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
      ownPermission,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      saveNoteDialog,
      deleteNote,
      closeDeleteDialog,
      confirmDeleteNote,
    } = useSaplingNote();
    return {
      groups,
      selectedTab,
      currentNotes,
      editDialog,
      deleteDialog,
      templates,
      isLoading,
      entity,
      ownPermission,
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
