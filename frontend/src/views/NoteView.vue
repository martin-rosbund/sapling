
<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <sapling-header />
    <!-- Loading skeleton while data is loading -->
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"/>
    <!-- Data table with server-side pagination and actions -->
    <template v-else>
      <v-card class="my-4 pa-4 d-flex flex-column" style="width: 100%;">
        <v-row class="align-center mb-2" no-gutters>
          <v-col cols="auto" class="flex-grow-1 pr-0">
            <v-tabs v-model="selectedTab" grow height="40">
              <v-tab v-for="(person, idx) in persons" :key="person.handle ?? idx" :value="idx" style="min-width: 120px; padding: 0 12px; font-size: 1rem;">
                {{ person.firstName }} {{ person.lastName }}
              </v-tab>
            </v-tabs>
          </v-col>
          <v-col cols="auto" class="pl-0">
            <v-btn color="primary" @click="openCreateDialog" class="ma-0" style="min-width: 120px;">
              {{ $t('create') }}
            </v-btn>
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
                      <div>
                        <v-btn icon size="small" @click="openEditDialog(note)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon size="small" color="error" @click="deleteNote(note)"><v-icon>mdi-delete</v-icon></v-btn>
                      </div>
                    </v-card-title>
                    <v-card-text>
                      <div style="white-space: pre-line;">{{ note.description }}</div>
                    </v-card-text>
                    <v-card-subtitle class="text-caption text-right">
                      {{ note.createdAt ? $d(new Date(note.createdAt), 'short') : '' }}
                    </v-card-subtitle>
                  </v-card>
                </v-col>
              </v-row>
            </v-item-group>
          </v-col>
        </v-row>
      </v-card>
    </template>
    <sapling-footer />

    <!-- Gekapselter Dialog für Notiz erstellen/bearbeiten -->
    <EntityEditDialog
      :model-value="editDialog.visible"
      :mode="editDialog.mode"
      :item="editDialog.item"
      :templates="templates"
      @update:model-value="val => editDialog.visible = val"
      @save="saveNoteDialog"
      @cancel="closeEditDialog"
    />

    <!-- Gekapselter Dialog für Löschen mit Rückfrage -->
    <EntityDeleteDialog
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="val => deleteDialog.visible = val"
      @confirm="confirmDeleteNote"
      @cancel="closeDeleteDialog"
    />
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import ApiGenericService from '@/services/api.generic.service';
import EntityEditDialog from '@/components/entity/EntityEditDialog.vue';
import EntityDeleteDialog from '@/components/entity/EntityDeleteDialog.vue';
import type { PersonItem, NoteItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import ApiService from '@/services/api.service';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';

export default defineComponent({
  components: { SaplingHeader, SaplingFooter, EntityEditDialog, EntityDeleteDialog },
  setup() {
    const persons = ref<PersonItem[]>([]);
    const selectedTab = ref(0);
    const templates = ref<EntityTemplate[]>([]);
    const isLoading = ref(true);

    // Dialog-States für Edit und Delete
    const editDialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: NoteItem | null }>({ visible: false, mode: 'create', item: null });
    const deleteDialog = ref<{ visible: boolean; item: NoteItem | null }>({ visible: false, item: null });

    // Notizen der aktuell ausgewählten Person
    const currentNotes = computed(() => {
      const person = persons.value[selectedTab.value];
      if (!person || !Array.isArray(person.notes)) return [];
      // Filtere Notizen mit gültigem handle
      return person.notes.filter(n => n && n.handle != null);
    });

    /**
     * Load template definitions for the entity and generate table headers.
     */
    const loadTemplates = async () => {
      templates.value = await ApiService.findAll<EntityTemplate[]>(`template/note`);
    };

    /**
     * Load translations for the current entity using the TranslationService.
     * Sets loading state while fetching.
     */
    const loadTranslation = async () => {
      isLoading.value = true;
      const translationService = new TranslationService(CookieService.get('language'));
      await translationService.prepare('note', 'global');
      isLoading.value = false;
    };

    // Personen laden
    const loadPersons = async () => {
      const data = (await ApiGenericService.find<PersonItem>('person')).data;
      persons.value = data;
    };

    // Notiz erstellen Dialog öffnen
    const openCreateDialog = () => {
      editDialog.value = { visible: true, mode: 'create', item: null };
    };

    // Notiz bearbeiten Dialog öffnen
    const openEditDialog = (note: NoteItem) => {
      editDialog.value = { visible: true, mode: 'edit', item: note };
    };

    // Edit-Dialog schließen
    const closeEditDialog = () => {
      editDialog.value.visible = false;
    };

    // Notiz speichern (neu oder bearbeiten) über EntityEditDialog
    const saveNoteDialog = async (item: { title: string; description: string }) => {
      const person = persons.value[selectedTab.value];
      if (!person) return;
      if (editDialog.value.mode === 'edit' && editDialog.value.item && editDialog.value.item.handle != null) {
        // Update
        await ApiGenericService.update<NoteItem>('note', { handle: String(editDialog.value.item.handle) }, {
          title: item.title,
          description: item.description,
        });
      } else {
        // Create
        await ApiGenericService.create<NoteItem>('note', {
          title: item.title,
          description: item.description,
          person: person.handle,
        });
      }
      editDialog.value.visible = false;
      await loadPersons();
    };

    // Delete-Dialog öffnen
    const deleteNote = (note: NoteItem) => {
      deleteDialog.value = { visible: true, item: note };
    };

    // Delete-Dialog schließen
    const closeDeleteDialog = () => {
      deleteDialog.value.visible = false;
    };

    // Löschen bestätigen
    const confirmDeleteNote = async () => {
      if (deleteDialog.value.item && deleteDialog.value.item.handle != null) {
        await ApiGenericService.delete('note', { handle: String(deleteDialog.value.item.handle) });
        await loadPersons();
      }
      deleteDialog.value.visible = false;
    };

  /**
   * Reload all data: translations, templates, and table data.
   */
  const reloadAll = async () => {
    await loadTranslation();
    await loadPersons();
    await loadTemplates();
  };

  // Initial load on mount
  onMounted(reloadAll);

    return {
      persons,
      selectedTab,
      currentNotes,
      editDialog,
      deleteDialog,
      templates,
      isLoading,
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