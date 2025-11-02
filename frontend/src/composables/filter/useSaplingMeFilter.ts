import type { PersonItem } from '@/entity/entity';

export function useSaplingMeFilter(props: {
  ownPerson: PersonItem,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
}, emit: (event: 'togglePerson', ...args: any[]) => void) {
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }
  return {
    togglePerson,
  };
}
