import { toRefs } from 'vue'
import type { CompanyItem } from '@/entity/entity'
import type { PaginatedResponse } from '@/entity/structure'

export type UseSaplingFilterCompanyProps = {
  companies: PaginatedResponse<CompanyItem> | undefined
  companiesSearch?: string
  isCompanySelected: (id: number) => boolean
}

export type UseSaplingFilterCompanyEmit = {
  (event: 'toggleCompany', id: number, checked?: boolean): void
  (event: 'searchCompanies', value: string): void
  (event: 'pageCompanies', value: number): void
}

export function useSaplingFilterCompany(
  props: UseSaplingFilterCompanyProps,
  emit: UseSaplingFilterCompanyEmit,
) {
  //#region State
  const { companies, companiesSearch } = toRefs(props)
  //#endregion

  //#region Actions
  /**
   * Emits the selection update for a single company row.
   */
  function toggleCompany(id: number, checked?: boolean | null) {
    emit('toggleCompany', id, checked ?? undefined)
  }

  /**
   * Emits the current free-text company search term.
   */
  function onCompaniesSearch(value: string | null) {
    emit('searchCompanies', value ?? '')
  }

  /**
   * Emits the next requested company page.
   */
  function onCompaniesPage(value: number) {
    emit('pageCompanies', value)
  }

  //#region Return
  return {
    companies,
    companiesSearch,
    isCompanySelected: props.isCompanySelected,
    toggleCompany,
    onCompaniesSearch,
    onCompaniesPage,
  }
  //#endregion
}
