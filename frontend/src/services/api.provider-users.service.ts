import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { pushApiErrorMessage } from '@/services/api.error.service'

export type ProviderUserProvider = 'azure' | 'google'
export type ProviderUserImportAction = 'created' | 'updated' | 'skipped' | 'failed'

export interface ProviderUser {
  provider: ProviderUserProvider
  id: string
  displayName: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  userPrincipalName?: string | null
  existingPersonHandle?: number | null
}

export interface ProviderUserListResponse {
  users: ProviderUser[]
  nextPageToken?: string | null
}

export interface ProviderUserImportRow {
  providerUserId: string
  action: ProviderUserImportAction
  personHandle?: number | null
  displayName?: string | null
  email?: string | null
  message?: string | null
}

export interface ProviderUserImportResponse {
  created: number
  updated: number
  skipped: number
  failed: number
  rows: ProviderUserImportRow[]
}

class ApiProviderUsersService {
  static async list({
    provider,
    search,
    pageToken,
    signal,
  }: {
    provider: ProviderUserProvider
    search?: string
    pageToken?: string | null
    signal?: AbortSignal
  }): Promise<ProviderUserListResponse> {
    try {
      const response = await axios.get<ProviderUserListResponse>(
        `${BACKEND_URL}auth/provider-users`,
        {
          params: {
            provider,
            search: search?.trim() || undefined,
            pageToken: pageToken || undefined,
          },
          signal,
        },
      )
      return response.data
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        throw error
      }

      pushApiErrorMessage(error, 'exception.unknownError', 'providerUserImport')
      throw error
    }
  }

  static async importUsers({
    provider,
    userIds,
    roleHandles,
    companyHandle,
  }: {
    provider: ProviderUserProvider
    userIds: string[]
    roleHandles: number[]
    companyHandle?: number | null
  }): Promise<ProviderUserImportResponse> {
    try {
      const response = await axios.post<ProviderUserImportResponse>(
        `${BACKEND_URL}auth/provider-users/import`,
        {
          provider,
          userIds,
          roleHandles,
          companyHandle: companyHandle ?? undefined,
        },
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', 'providerUserImport')
      throw error
    }
  }
}

export default ApiProviderUsersService
