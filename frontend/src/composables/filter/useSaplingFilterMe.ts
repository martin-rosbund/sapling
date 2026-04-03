import { toRefs } from 'vue';
import type { PersonItem } from '@/entity/entity';

export type UseSaplingFilterMeProps = {
  ownPerson: PersonItem,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
};

export type UseSaplingFilterMeEmit = {
  (event: 'togglePerson', id: number, checked?: boolean): void;
};

export function useSaplingFilterMe(props: UseSaplingFilterMeProps, emit: UseSaplingFilterMeEmit) {
  //#region State
  const { ownPerson } = toRefs(props);
  //#endregion

  //#region Actions
  /**
   * Emits the selection update for the current user entry.
   */
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }

  //#region Return
  return {
    ownPerson,
    isPersonSelected: props.isPersonSelected,
    getPersonId: props.getPersonId,
    getPersonName: props.getPersonName,
    togglePerson,
  };
  //#endregion
}
