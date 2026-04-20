import { computed } from 'vue'
import type { CountryItem } from '@/entity/entity'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { formatSaplingPhoneNumber } from '@/utils/saplingPhoneUtil'

function getCountryHandle(country?: CountryItem | string | null): string | null {
  if (!country) {
    return null
  }

  return typeof country === 'string' ? country : country.handle
}

function getCountryDialingCode(country?: CountryItem | string | null): string | null {
  if (!country || typeof country === 'string') {
    return null
  }

  return country.dialingCode ?? null
}

export function useSaplingPhoneNumber() {
  const currentPersonStore = useCurrentPersonStore()

  const currentCountry = computed(() => currentPersonStore.person?.company?.country ?? null)
  const currentCountryHandle = computed(() => getCountryHandle(currentCountry.value))
  const currentDialingCode = computed(() => getCountryDialingCode(currentCountry.value))

  function formatPhoneNumber(value: string | null | undefined): string {
    return formatSaplingPhoneNumber(value, {
      defaultCountry: currentCountryHandle.value,
      defaultDialingCode: currentDialingCode.value,
    })
  }

  return {
    currentCountryHandle,
    currentDialingCode,
    formatPhoneNumber,
  }
}
