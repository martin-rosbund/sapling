import { toRefs } from 'vue'
import type { PersonItem } from '@/entity/entity'
import type { PaginatedResponse } from '@/entity/structure'

export type UseSaplingFilterEmployeeProps = {
  companyPeoples: PaginatedResponse<PersonItem> | undefined
  employeeSearch?: string
  isPersonSelected: (id: number) => boolean
  getPersonId: (person: PersonItem) => number
  getPersonName: (person: PersonItem) => string
}

export type UseSaplingFilterEmployeeEmit = {
  (event: 'togglePerson', id: number, checked?: boolean): void
  (event: 'searchEmployees', value: string): void
  (event: 'pageEmployees', value: number): void
}

export function useSaplingFilterEmployee(
  props: UseSaplingFilterEmployeeProps,
  emit: UseSaplingFilterEmployeeEmit,
) {
  //#region State
  const { companyPeoples, employeeSearch } = toRefs(props)
  //#endregion

  //#region Actions
  /**
   * Emits the selection update for a colleague entry.
   */
  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined)
  }

  /**
   * Emits the current free-text employee search term.
   */
  function onEmployeeSearch(value: string | null) {
    emit('searchEmployees', value ?? '')
  }

  /**
   * Emits the next requested employee page.
   */
  function onEmployeePage(value: number) {
    emit('pageEmployees', value)
  }

  //#region Return
  return {
    companyPeoples,
    employeeSearch,
    isPersonSelected: props.isPersonSelected,
    getPersonId: props.getPersonId,
    getPersonName: props.getPersonName,
    togglePerson,
    onEmployeeSearch,
    onEmployeePage,
  }
  //#endregion
}
