import type { CompanyItem } from '@/entity/entity';
import { ref } from 'vue';

export function useSaplingCompanyFilter(props: {
  companies: CompanyItem[],
  companiesTotal?: number,
  companiesSearch?: string,
  companiesPage?: number,
  companiesPageSize: number,
  isCompanySelected: (id: number) => boolean
}, emit: (event: 'toggleCompany' | 'searchCompanies' | 'pageCompanies', ...args: any[]) => void) {
  function toggleCompany(id: number, checked?: boolean | null) {
    emit('toggleCompany', id, checked ?? undefined);
  }
  function searchCompanies(val: string) {
    emit('searchCompanies', val);
  }
  function pageCompanies(val: number) {
    emit('pageCompanies', val);
  }
  return {
    toggleCompany,
    searchCompanies,
    pageCompanies,
  };
}
