import { toRefs } from 'vue';
import type { PersonItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';

export type UseSaplingFilterEmployeeProps = {
  companyPeoples: PaginatedResponse<PersonItem> | undefined,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
};

export type UseSaplingFilterEmployeeEmit = {
  (event: 'togglePerson', id: number, checked?: boolean): void;
};

export function useSaplingFilterEmployee(props: UseSaplingFilterEmployeeProps, emit: UseSaplingFilterEmployeeEmit) {
  //#region State
  const { companyPeoples } = toRefs(props);
  //#endregion

  //#region Actions
  /**
   * Emits the selection update for a colleague entry.
   */
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }

  //#region Return
  return {
    companyPeoples,
    isPersonSelected: props.isPersonSelected,
    getPersonId: props.getPersonId,
    getPersonName: props.getPersonName,
    togglePerson,
  };
  //#endregion
}
