import type { PersonItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';

export function useSaplingPersonFilter(props: {
  people: PaginatedResponse<PersonItem> | undefined,
  peopleSearch?: string,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
}, emit: (event: 'togglePerson' | 'searchPeople' | 'pagePeople', ...args: unknown[]) => void) {
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }
  function searchPeople(val: string) {
    emit('searchPeople', val);
  }
  function pagePeople(val: number) {
    emit('pagePeople', val);
  }
  return {
    togglePerson,
    searchPeople,
    pagePeople,
  };
}
