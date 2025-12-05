import type { PersonItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';

export function useSaplingEmployeeFilter(props: {
  companyPeoples: PaginatedResponse<PersonItem> | undefined,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
}, emit: (event: 'togglePerson', ...args: unknown[]) => void) {
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }
  return {
    togglePerson,
  };
}
