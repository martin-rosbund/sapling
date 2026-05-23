import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { pushApiErrorMessage } from '@/services/api.error.service'
import type { EntityTemplate, SaplingFormConfigPayload } from '@/entity/structure'

export interface SaplingFormConfigItem {
  handle?: number
  name: string
  entity: string | { handle?: string }
  scope: 'global' | 'role' | 'person'
  scopeHandle?: string | null
  isActive: boolean
  isDefault: boolean
  version: number
  config: SaplingFormConfigPayload
}

export interface SaveSaplingFormConfigPayload {
  name: string
  scope?: 'global' | 'role' | 'person'
  scopeHandle?: string | null
  isActive?: boolean
  isDefault?: boolean
  config: SaplingFormConfigPayload
}

export interface SaplingFormConfigValidationIssue {
  path: string
  message: string
}

export interface SaplingFormConfigValidationResult {
  isValid: boolean
  errors: SaplingFormConfigValidationIssue[]
  warnings: SaplingFormConfigValidationIssue[]
  normalizedConfig: SaplingFormConfigPayload
}

class ApiFormConfigService {
  static async getEffectiveTemplate(entityHandle: string): Promise<EntityTemplate[]> {
    try {
      const response = await axios.get<{ entityTemplates: EntityTemplate[] }>(
        `${BACKEND_URL}form-config/${entityHandle}/effective-template`,
      )
      return response.data.entityTemplates
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async list(entityHandle: string): Promise<SaplingFormConfigItem[]> {
    try {
      const response = await axios.get<SaplingFormConfigItem[]>(
        `${BACKEND_URL}form-config/${entityHandle}`,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async validate(
    entityHandle: string,
    config: SaplingFormConfigPayload,
  ): Promise<SaplingFormConfigValidationResult> {
    try {
      const response = await axios.post<SaplingFormConfigValidationResult>(
        `${BACKEND_URL}form-config/${entityHandle}/validate`,
        config,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async export(entityHandle: string, handle: number): Promise<SaplingFormConfigPayload> {
    try {
      const response = await axios.get<SaplingFormConfigPayload>(
        `${BACKEND_URL}form-config/${entityHandle}/${handle}/export`,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async create(
    entityHandle: string,
    payload: SaveSaplingFormConfigPayload,
  ): Promise<SaplingFormConfigItem> {
    try {
      const response = await axios.post<SaplingFormConfigItem>(
        `${BACKEND_URL}form-config/${entityHandle}`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async update(
    entityHandle: string,
    handle: number,
    payload: SaveSaplingFormConfigPayload,
  ): Promise<SaplingFormConfigItem> {
    try {
      const response = await axios.patch<SaplingFormConfigItem>(
        `${BACKEND_URL}form-config/${entityHandle}/${handle}`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }

  static async import(
    entityHandle: string,
    payload: SaveSaplingFormConfigPayload,
  ): Promise<SaplingFormConfigItem> {
    try {
      const response = await axios.post<SaplingFormConfigItem>(
        `${BACKEND_URL}form-config/${entityHandle}/import`,
        payload,
      )
      return response.data
    } catch (error: unknown) {
      pushApiErrorMessage(error, 'exception.unknownError', entityHandle)
      throw error
    }
  }
}

export default ApiFormConfigService
