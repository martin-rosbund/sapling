
// Importing required modules and types
import { ref, computed, onMounted, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import ApiService from '@/services/api.service';
import TranslationService from '@/services/translation.service';
import type { NoteItem, NoteGroupItem, EntityItem, PersonItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';

/**
 * Composable for managing note table state, dialogs, and translations.
 *
 * This composable provides state management and utility functions for handling
 * note tables, including dialog visibility, loading notes, templates, translations,
 * and CRUD operations for notes and note groups.
 */
export function useSaplingNote() {

  // #region State
  // Note groups
  const groups = ref<NoteGroupItem[]>([]);

  // Notes der aktuellen Gruppe
  const notes = ref<NoteItem[]>([]);

  // Current entity
  const entity = ref<EntityItem | null>(null);

  // Selected tab index
  const selectedTab = ref(0);

  // Note templates
  const templates = ref<EntityTemplate[]>([]);

  // Loading state
  const isLoading = ref(true);

  // Translation service instance (reactive)
  const translationService = ref(new TranslationService());

  // Dialog states for edit and delete
  const editDialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: NoteItem | null }>({ visible: false, mode: 'create', item: null });
  const deleteDialog = ref<{ visible: boolean; item: NoteItem | null }>({ visible: false, item: null });

  // Notes der aktuell geladenen Gruppe
  const currentNotes = computed(() => notes.value);
		// #endregion State

  // #region Store
  const currentPersonStore = useCurrentPersonStore();
  // #endregion Store

  /**
   * Loads note templates.
   */
  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/note`);
  };

  /**
   * Loads the entity definition.
   */
  const loadEntity = async () => {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, {filter: { handle: 'note' }, limit: 1, page: 1 })).data[0] || null;
  };

  /**
   * Loads translations for notes and note groups.
   */
  const loadTranslation = async () => {
    await translationService.value.prepare('note','noteGroup', 'global');
  };

  /**
   * Lädt Gruppen und setzt sie in den State.
   */
  const loadGroups = async () => {
    groups.value = (await ApiGenericService.find<NoteGroupItem>('noteGroup')).data;
  };

  /**
   * Lädt Notizen für die aktuell ausgewählte Gruppe und Person.
   */
  const loadNotesForGroup = async () => {
    const group = groups.value[selectedTab.value];
    if (!group || !currentPersonStore.person) {
      notes.value = [];
      return;
    }
    notes.value = (await ApiGenericService.find<NoteItem>('note', { filter: { person: currentPersonStore.person.handle, group: group.handle } })).data;
  };

  /**
   * Opens the create dialog.
   */
  const openCreateDialog = () => {
    editDialog.value = { visible: true, mode: 'create', item: null };
  };

  /**
   * Opens the edit dialog for a note.
   */
  const openEditDialog = (note: NoteItem) => {
    editDialog.value = { visible: true, mode: 'edit', item: note };
  };

  /**
   * Closes the edit dialog.
   */
  const closeEditDialog = () => {
    editDialog.value.visible = false;
  };

  /**
   * Saves the note from the dialog (create or update).
   */
  const saveNoteDialog = async (item: { title: string; description: string }) => {
    const group = groups.value[selectedTab.value];
    if (!group) return;
    if (editDialog.value.mode === 'edit' && editDialog.value.item && editDialog.value.item.handle != null) {
      await ApiGenericService.update<NoteItem>('note', { handle: String(editDialog.value.item.handle) }, {
        title: item.title,
        description: item.description,
      });
    } else {
      await ApiGenericService.create<NoteItem>('note', {
        title: item.title,
        description: item.description,
        group: group.handle,
        person: currentPersonStore.person?.handle,
      });
    }
    editDialog.value.visible = false;
    await loadNotesForGroup();
  };

  /**
   * Opens the delete dialog for a note.
   */
  const deleteNote = (note: NoteItem) => {
    deleteDialog.value = { visible: true, item: note };
  };

  /**
   * Closes the delete dialog.
   */
  const closeDeleteDialog = () => {
    deleteDialog.value.visible = false;
  };

  /**
   * Confirms and deletes the selected note.
   */
  const confirmDeleteNote = async () => {
    if (deleteDialog.value.item && deleteDialog.value.item.handle != null) {
      await ApiGenericService.delete('note', { handle: String(deleteDialog.value.item.handle) });
      await loadNotesForGroup();
    }
    deleteDialog.value.visible = false;
  };

  /**
   * Reloads all data: translations, groups, and templates.
   */
  const reloadAll = async () => {
    isLoading.value = true;
    await currentPersonStore.fetchCurrentPerson();
    await loadTranslation();
    await loadGroups();
    await loadTemplates();
    await loadEntity();
    await loadNotesForGroup();
    isLoading.value = false;
  };

  // Initial load on mount
  onMounted(reloadAll);

  // Notizen nachladen, wenn Gruppe gewechselt wird
  watch(selectedTab, loadNotesForGroup);

  // Reload translations und alles weitere bei Locale-Wechsel
  watch(
    () => i18n.global.locale.value,
    reloadAll
  );

  // Return reactive state and methods
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
    reloadAll,
  };
}
