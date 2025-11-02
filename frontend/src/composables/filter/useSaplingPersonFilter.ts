import type { PersonItem } from '@/entity/entity';

export function useSaplingPersonFilter(props: {
  people: PersonItem[],
  peopleTotal?: number,
  peopleSearch?: string,
  peoplePage?: number,
  peoplePageSize: number,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
}, emit: (event: 'togglePerson' | 'searchPeople' | 'pagePeople', ...args: any[]) => void) {
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
