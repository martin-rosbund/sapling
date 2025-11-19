<template>
  <div>
    <v-text-field
      :model-value="localSearch"
      @update:model-value="onSearchUpdate"
      :label="$t('global.search')"
      prepend-inner-icon="mdi-magnify"
      hide-details
      single-line
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

// Props and Emits
interface SaplingSearchProps {
  modelValue: string;
}
const props = defineProps<SaplingSearchProps>();
const emit = defineEmits(['update:model-value']);

// Local State
const localSearch = ref(props.modelValue);

// Watchers
watch(() => props.modelValue, (val) => {
  localSearch.value = val;
});

// Methods
function onSearchUpdate(val: string) {
  localSearch.value = val;
  emit('update:model-value', val);
}
</script>