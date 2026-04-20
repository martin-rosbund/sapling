import { toRefs } from 'vue'
import type { PersonItem } from '@/entity/entity'
import type { PaginatedResponse } from '@/entity/structure'

export type UseSaplingFilterPersonProps = {
  people: PaginatedResponse<PersonItem> | undefined
  peopleSearch?: string
  isPersonSelected: (id: number) => boolean
  getPersonId: (person: PersonItem) => number
  getPersonName: (person: PersonItem) => string
}

export type UseSaplingFilterPersonEmit = {
  (event: 'togglePerson', id: number, checked?: boolean): void
  (event: 'searchPeople', value: string): void
  (event: 'pagePeople', value: number): void
}

export function useSaplingFilterPerson(
  props: UseSaplingFilterPersonProps,
  emit: UseSaplingFilterPersonEmit,
) {
  //#region State
  const { people, peopleSearch } = toRefs(props)
  //#endregion

  //#region Actions
  /**
   * Emits the selection update for a single person row.
   */
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined)
  }

  /**
   * Emits the current free-text people search term.
   */
  function onPeopleSearch(value: string | null) {
    emit('searchPeople', value ?? '')
  }

  /**
   * Emits the next requested people page.
   */
  function onPeoplePage(value: number) {
    emit('pagePeople', value)
  }

  //#region Return
  return {
    people,
    peopleSearch,
    isPersonSelected: props.isPersonSelected,
    getPersonId: props.getPersonId,
    getPersonName: props.getPersonName,
    togglePerson,
    onPeopleSearch,
    onPeoplePage,
  }
  //#endregion
}
