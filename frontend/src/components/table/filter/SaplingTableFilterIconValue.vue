<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="mdiIcons"
    item-title="name"
    item-value="name"
    :label="$t('filter.icon')"
    density="comfortable"
    variant="outlined"
    hide-details
    clearable
    :loading="isLoading"
    class="sapling-table-filter-menu__field"
    @update:model-value="updateValue"
  >
    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps" :prepend-icon="item.name" :title="item.name" />
    </template>
    <template #selection="{ item }">
      <div class="sapling-table-filter-icon-selection">
        <v-icon size="small">{{ item.name }}</v-icon>
        <span>{{ item.name }}</span>
      </div>
    </template>
  </v-autocomplete>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'

// The full icon catalog is large (~340kB source). Defer loading it until this
// filter actually mounts so tables without an icon filter never pay the cost.
const mdiIcons = ref<Array<{ name: string; unicode?: string }>>([])
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    const mod = await import('@/constants/mdi.icons')
    mdiIcons.value = mod.mdiIcons
  } finally {
    isLoading.value = false
  }
})

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function updateValue(value: string | null) {
  emit('update:modelValue', value ?? '')
}
</script>
