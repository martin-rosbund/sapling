<template>
  <SaplingSurface
    :as="VSkeletonLoader"
    v-if="isLoading"
    class="mx-auto fill-height"
    elevation="12"
    type="article, actions, table"
    width="100%"
  />
  <SaplingError v-else-if="hasError" />
  <SaplingAccessDenied v-else-if="!isAccessible" :entity-handle="entityHandle" />
  <slot v-else />
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { VSkeletonLoader } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingAccessDenied from '@/components/system/SaplingAccessDenied.vue'
import SaplingError from '@/components/system/SaplingError.vue'
import { useGenericStore } from '@/stores/genericStore'
import { canAccessEntityWorkspace } from '@/utils/entityAccess'

const props = defineProps<{
  entityHandle: string
}>()

const genericStore = useGenericStore()
const hasError = ref(false)
const isBootstrapping = ref(true)

const entityState = computed(() => genericStore.getState(props.entityHandle))
const isLoading = computed(() => isBootstrapping.value || entityState.value.isLoading)
const isAccessible = computed(() => canAccessEntityWorkspace(entityState.value.entityPermission))

watch(
  () => props.entityHandle,
  async (entityHandle) => {
    if (!entityHandle) {
      hasError.value = true
      isBootstrapping.value = false
      return
    }

    isBootstrapping.value = true
    hasError.value = false

    try {
      await genericStore.loadGeneric(entityHandle, 'global', 'filter', 'exception')
    } catch {
      hasError.value = true
    } finally {
      isBootstrapping.value = false
    }
  },
  { immediate: true },
)
</script>
