import type { CompanyItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';

export function useSaplingCompanyFilter(props: {
  companies: PaginatedResponse<CompanyItem> | undefined,
  companiesSearch?: string,
  isCompanySelected: (id: number) => boolean
}, emit: (event: 'toggleCompany' | 'searchCompanies' | 'pageCompanies', ...args: unknown[]) => void) {
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
