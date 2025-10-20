import { ref, computed, onMounted, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import ApiService from '@/services/api.service';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import type { NoteItem, NoteGroupItem, EntityItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';

/**
 * Composable for managing note table state, dialogs, and translations.
 */
export function useNoteTable() {
  const groups = ref<NoteGroupItem[]>([]);
  const entity = ref<EntityItem | null>(null);
  const selectedTab = ref(0);
  const templates = ref<EntityTemplate[]>([]);
  const isLoading = ref(true);

  // Dialog states for edit and delete
  const editDialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: NoteItem | null }>({ visible: false, mode: 'create', item: null });
  const deleteDialog = ref<{ visible: boolean; item: NoteItem | null }>({ visible: false, item: null });

  // Notes of the currently selected group
  const currentNotes = computed(() => {
    const group = groups.value[selectedTab.value];
    if (!group || !Array.isArray(group.notes)) return [];
    return group.notes.filter(n => n && n.handle != null);
  });

  /**
   * Load note templates.
   */
  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/note`);
  };

  /**
   * Load entity definition.
   */
  const loadEntity = async () => {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { handle: 'note' }, {}, 1, 1)).data[0] || null;
  };

  /**
   * Load translations for notes and note groups.
   */
  const loadTranslation = async () => {
    const translationService = new TranslationService(CookieService.get('language'));
    await translationService.prepare('note','noteGroup', 'global');
  };

  /**
   * Load note groups.
   */
  const loadGroups = async () => {
    const data = (await ApiGenericService.find<NoteGroupItem>('noteGroup')).data;
    groups.value = data;
  };

  /**
   * Open create dialog.
   */
  const openCreateDialog = () => {
    editDialog.value = { visible: true, mode: 'create', item: null };
  };

  /**
   * Open edit dialog for a note.
   */
  const openEditDialog = (note: NoteItem) => {
    editDialog.value = { visible: true, mode: 'edit', item: note };
  };

  /**
   * Close edit dialog.
   */
  const closeEditDialog = () => {
    editDialog.value.visible = false;
  };

  /**
   * Save note from dialog (create or update).
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
      });
    }
    editDialog.value.visible = false;
    await loadGroups();
  };

  /**
   * Open delete dialog for a note.
   */
  const deleteNote = (note: NoteItem) => {
    deleteDialog.value = { visible: true, item: note };
  };

  /**
   * Close delete dialog.
   */
  const closeDeleteDialog = () => {
    deleteDialog.value.visible = false;
  };

  /**
   * Confirm and delete the selected note.
   */
  const confirmDeleteNote = async () => {
    if (deleteDialog.value.item && deleteDialog.value.item.handle != null) {
      await ApiGenericService.delete('note', { handle: String(deleteDialog.value.item.handle) });
      await loadGroups();
    }
    deleteDialog.value.visible = false;
  };

  /**
   * Reload all data: translations, groups, and templates.
   */
  const reloadAll = async () => {
    isLoading.value = true;
    await loadTranslation();
    await loadGroups();
    await loadTemplates();
    await loadEntity();
    isLoading.value = false;
  };

  onMounted(reloadAll);

  // Reload translations and templates when locale changes
  watch(
    () => i18n.global.locale.value,
    reloadAll
  );

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
