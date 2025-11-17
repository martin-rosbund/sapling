
<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-note
      :groups="groups"
      :selectedTab="selectedTab"
      :currentNotes="currentNotes"
      :editDialog="editDialog"
      :deleteDialog="deleteDialog"
      :entity-templates="entityTemplates"
      :isLoading="isLoading"
      :entity="entity"
      :entity-permission="entityPermission"
      @update:selectedTab="val => selectedTab = val"
      @open-create="openCreateDialog"
      @open-edit="openEditDialog"
      @close-edit="closeEditDialog"
      @save-edit="saveNoteDialog"
      @open-delete="deleteNote"
      @close-delete="closeDeleteDialog"
      @confirm-delete="confirmDeleteNote"/>

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
      isLoading,
      entity,     
      entityPermission,
      entityTemplates,
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
      isLoading,
      entity,
      entityPermission,
      entityTemplates,
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
