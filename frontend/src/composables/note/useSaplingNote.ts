import { computed, onMounted, reactive, ref, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { NoteItem, NoteGroupItem, SaplingGenericItem } from '@/entity/entity';
import type { DialogSaveAction, DialogState } from '@/entity/structure';
import { i18n } from '@/i18n';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { useGenericStore } from '@/stores/genericStore';

type NoteDialogMode = 'create' | 'edit';

interface NoteDialogState {
  visible: boolean;
  mode: NoteDialogMode;
  item: NoteItem | null;
}

interface NoteDeleteDialogState {
  visible: boolean;
  item: NoteItem | null;
}

interface NoteDialogPayload {
  title: string;
  description: string;
}

/**
 * Encapsulates note group loading, note CRUD dialog state, and note list interactions.
 */
export function useSaplingNote() {
  // #region State
  const genericStore = useGenericStore();
  const currentPersonStore = useCurrentPersonStore();

  genericStore.loadGeneric('note', 'noteGroup', 'global');

  const groups = ref<NoteGroupItem[]>([]);
  const notes = ref<NoteItem[]>([]);
  const selectedTab = ref(0);
  const editDialog = reactive<NoteDialogState>({
    visible: false,
    mode: 'create',
    item: null,
  });
  const deleteDialog = reactive<NoteDeleteDialogState>({
    visible: false,
    item: null,
  });

  const entity = computed(() => genericStore.getState('note').entity);
  const entityPermission = computed(() => genericStore.getState('note').entityPermission);
  const entityTemplates = computed(() => genericStore.getState('note').entityTemplates);
  const isLoading = computed(() => genericStore.getState('note').isLoading);
  const currentGroup = computed(() => groups.value[selectedTab.value] ?? null);
  const currentNotes = computed(() => notes.value);
  const editDialogItem = computed(() => (editDialog.item ? { ...editDialog.item } : null));
  const deleteDialogItem = computed(() => (deleteDialog.item ? { ...deleteDialog.item } : null));
  // #endregion

  // #region Lifecycle
  onMounted(reloadAll);

  watch(selectedTab, loadNotesForGroup);

  watch(
    () => currentPersonStore.person?.handle,
    loadNotesForGroup,
  );

  watch(
    () => i18n.global.locale.value,
    reloadAll,
  );
  // #endregion

  // #region Methods
  /**
   * Loads all note groups and keeps the selected tab index within range.
   */
  async function loadGroups() {
    groups.value = (await ApiGenericService.find<NoteGroupItem>('noteGroup')).data || [];
    syncSelectedTab();
  }

  /**
   * Loads the notes for the currently selected group and active person.
   */
  async function loadNotesForGroup() {
    if (!currentGroup.value?.handle || !currentPersonStore.person?.handle) {
      notes.value = [];
      return;
    }

    notes.value = (await ApiGenericService.find<NoteItem>('note', {
      filter: {
        person: currentPersonStore.person.handle,
        group: currentGroup.value.handle,
      },
    })).data || [];
  }

  /**
   * Reloads the current person, note groups, and notes for the selected group.
   */
  async function reloadAll() {
    await Promise.all([
      currentPersonStore.fetchCurrentPerson(),
      loadGroups(),
    ]);

    await loadNotesForGroup();
  }

  /**
   * Ensures the selected tab always points to an available group.
   */
  function syncSelectedTab() {
    if (!groups.value.length) {
      selectedTab.value = 0;
      return;
    }

    selectedTab.value = Math.min(Math.max(selectedTab.value, 0), groups.value.length - 1);
  }

  /**
   * Opens the delete dialog for a note.
   */
  function openDeleteDialog(note: NoteItem) {
    deleteDialog.visible = true;
    deleteDialog.item = note;
  }

  /**
   * Confirms and deletes the selected note.
   */
  async function confirmDeleteNote() {
    if (deleteDialog.item?.handle == null) {
      closeDeleteDialog();
      return;
    }

    await ApiGenericService.delete('note', deleteDialog.item.handle);
    await loadNotesForGroup();
    closeDeleteDialog();
  }

  /**
   * Closes the delete dialog.
   */
  function closeDeleteDialog() {
    deleteDialog.visible = false;
    deleteDialog.item = null;
  }

  /**
   * Synchronizes the delete dialog visibility with the shared dialog component.
   */
  function updateDeleteDialogVisibility(value: boolean) {
    deleteDialog.visible = value;
  }

  /**
   * Opens the edit dialog for a note.
   */
  function openEditDialog(note: NoteItem) {
    editDialog.visible = true;
    editDialog.mode = 'edit';
    editDialog.item = note;
  }

  /**
   * Closes the edit dialog.
   */
  function closeEditDialog() {
    editDialog.visible = false;
    editDialog.mode = 'create';
    editDialog.item = null;
  }

  /**
   * Synchronizes the edit dialog visibility with the shared dialog component.
   */
  function updateEditDialogVisibility(value: boolean) {
    editDialog.visible = value;
  }

  function updateEditDialogMode(value: DialogState) {
    editDialog.mode = value === 'readonly' ? 'edit' : value;
  }

  function updateEditDialogItem(value: SaplingGenericItem | null) {
    editDialog.item = value as NoteItem | null;
  }

  /**
   * Opens the create dialog.
   */
  function openCreateDialog() {
    editDialog.visible = true;
    editDialog.mode = 'create';
    editDialog.item = null;
  }

  /**
   * Persists the note dialog payload as either a new or updated note.
   */
  async function saveNoteDialog(item: NoteDialogPayload, action: DialogSaveAction) {
    if (!currentGroup.value?.handle || !currentPersonStore.person?.handle) {
      return;
    }

    let savedNote: NoteItem;

    if (editDialog.mode === 'edit' && editDialog.item?.handle != null) {
      savedNote = await ApiGenericService.update<NoteItem>('note', editDialog.item.handle, {
        title: item.title,
        description: item.description,
      });
    } else {
      savedNote = await ApiGenericService.create<NoteItem>('note', {
        title: item.title,
        description: item.description,
        group: currentGroup.value.handle,
        person: currentPersonStore.person.handle,
      });
    }

    await loadNotesForGroup();

    if (action === 'saveAndClose') {
      closeEditDialog();
      return;
    }

    editDialog.visible = true;
    editDialog.mode = 'edit';
    editDialog.item = savedNote;
  }
  // #endregion

  // #region Return
  return {
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
    reloadAll,
  };
  // #endregion
}
