import type { AiProviderModelItem, AiProviderTypeItem } from '@/entity/entity'

export type RuntimeTarget = {
  providerHandle: string | null
  modelHandle: string | null
}

type ResolveRuntimeTargetOptions = {
  providerConfigs: AiProviderTypeItem[]
  modelConfigs: AiProviderModelItem[]
  requestedProviderHandle?: string | null
  requestedModelHandle?: string | null
  preferredModelHandle?: string | null
}

export function getProviderHandle(provider?: AiProviderTypeItem | string | null) {
  if (!provider) {
    return null
  }

  if (typeof provider === 'string') {
    return provider
  }

  return provider.handle ?? null
}

export function getModelHandle(model?: AiProviderModelItem | string | null) {
  if (!model) {
    return null
  }

  if (typeof model === 'string') {
    return model
  }

  return model.handle ?? null
}

export function getModelProviderHandle(model?: AiProviderModelItem | string | null) {
  if (!model || typeof model === 'string') {
    return null
  }

  return getProviderHandle(model.provider)
}

export function getGlobalDefaultModel(modelConfigs: AiProviderModelItem[]) {
  return modelConfigs.find((item) => item.isDefault) ?? modelConfigs[0] ?? null
}

export function getDefaultModelForProvider(
  modelConfigs: AiProviderModelItem[],
  providerHandle?: string | null,
  preferredModelHandle?: string | null,
) {
  if (!providerHandle) {
    return null
  }

  const filteredModels = modelConfigs.filter(
    (item) => getModelProviderHandle(item) === providerHandle,
  )

  if (preferredModelHandle) {
    const preferredModel =
      filteredModels.find((item) => item.handle === preferredModelHandle) ?? null
    if (preferredModel) {
      return preferredModel
    }
  }

  return filteredModels.find((item) => item.isDefault) ?? filteredModels[0] ?? null
}

export function resolveRuntimeTarget({
  providerConfigs,
  modelConfigs,
  requestedProviderHandle,
  requestedModelHandle,
  preferredModelHandle,
}: ResolveRuntimeTargetOptions): RuntimeTarget {
  const availableProviderHandles = new Set(providerConfigs.map((item) => item.handle ?? ''))
  const availableModelHandles = new Set(modelConfigs.map((item) => item.handle ?? ''))

  if (requestedModelHandle && availableModelHandles.has(requestedModelHandle)) {
    const requestedModel = modelConfigs.find((item) => item.handle === requestedModelHandle) ?? null
    return {
      providerHandle: requestedProviderHandle ?? getModelProviderHandle(requestedModel),
      modelHandle: requestedModelHandle,
    }
  }

  if (requestedProviderHandle && availableProviderHandles.has(requestedProviderHandle)) {
    return {
      providerHandle: requestedProviderHandle,
      modelHandle:
        getDefaultModelForProvider(modelConfigs, requestedProviderHandle, preferredModelHandle)
          ?.handle ?? null,
    }
  }

  const defaultModel = getGlobalDefaultModel(modelConfigs)
  return {
    providerHandle: getModelProviderHandle(defaultModel),
    modelHandle: defaultModel?.handle ?? null,
  }
}
