import { ref, computed, onMounted, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { NoteItem, NoteGroupItem } from '@/entity/entity';
import { i18n } from '@/i18n';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { useGenericStore } from '@/stores/genericStore';

/**
 * Composable for managing note table state, dialogs, and translations.
 *
 * This composable provides state management and utility functions for handling
 * note tables, including dialog visibility, loading notes, templates, translations,
 * and CRUD operations for notes and note groups.
 */
export function useSaplingNote() {
  //#region State
  //Note groups
  const groups = ref<NoteGroupItem[]>([]);

  //Notes der aktuellen Gruppe
  const notes = ref<NoteItem[]>([]);

  // Generic store for entity, permissions, translations, and templates
  const genericStore = useGenericStore();
  genericStore.loadGeneric('note', 'noteGroup', 'global');
  const entity = computed(() => genericStore.getState('note').entity);
  const entityPermission = computed(() => genericStore.getState('note').entityPermission);
  const entityTemplates = computed(() => genericStore.getState('note').entityTemplates);
  const isLoading = computed(() => genericStore.getState('note').isLoading);
  //Selected tab index
  const selectedTab = ref(0);

  //Dialog states for edit and delete
  const editDialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: NoteItem | null }>({ visible: false, mode: 'create', item: null });
  const deleteDialog = ref<{ visible: boolean; item: NoteItem | null }>({ visible: false, item: null });

  //Notes der aktuell geladenen Gruppe
  const currentNotes = computed(() => notes.value);
  //#endregion

  //#region Store
  const currentPersonStore = useCurrentPersonStore();
  //#endregion

  //#region Load
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
  //#endregion

  //#region Delete
  /**
   * Opens the delete dialog for a note.
   */
  const deleteNote = (note: NoteItem) => {
    deleteDialog.value = { visible: true, item: note };
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
   * Closes the delete dialog.
   */
  const closeDeleteDialog = () => {
    deleteDialog.value.visible = false;
  };
  //#endregion

  //#region Edit
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
  //#endregion 

  //#region Create
  /**
   * Opens the create dialog.
   */
  const openCreateDialog = () => {
    editDialog.value = { visible: true, mode: 'create', item: null };
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
  //#endregion

  //#region Lifecycle
  /**
   * Reloads all data: translations, groups, and templates.
   */
  const reloadAll = async () => {
    await currentPersonStore.fetchCurrentPerson();
    await loadGroups();
    await loadNotesForGroup();
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
  //#endregion

  // Return reactive state and methods
  return {
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
    reloadAll,
  };
}
