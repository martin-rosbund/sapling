<template>
  <v-menu v-model="menu" :close-on-content-click="false" max-width="600px">
    <template #activator="{ props }">
      <v-text-field
        v-bind="props"
        :label="label"
        :model-value="selectedLabel"
        readonly
        @click="menu = true"
        append-inner-icon="mdi-chevron-down"
      />
    </template>
    <v-card>
      <v-text-field
        v-model="search"
        :label="$t('search')"
        @input="onSearch"
        clearable
        class="mb-2"
      />
      <v-table height="300px" style="overflow-y: auto;" @scroll.passive="onScroll">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ $t(col.name) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id ?? item.handle"
            @click="select(item)"
            style="cursor:pointer"
            :class="{ 'selected-row': isSelected(item) }"
          >
            <td v-for="col in columns" :key="col.key">{{ item[col.key] }}</td>
          </tr>
          <tr v-if="loading">
            <td :colspan="columns.length" class="text-center">
              <v-progress-circular indeterminate size="24" />
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-card-actions>
        <v-btn text @click="menu = false">{{ $t('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';

const props = defineProps<{
  label: string,
  columns: { key: string, name: string }[],
  fetchReferenceData: (params: { search: string, page: number, pageSize: number }) => Promise<{ items: any[], total: number }>,
  modelValue: any | null,
  template: { joinColumns?: string[] }
}>();
const emit = defineEmits(['update:modelValue']);

const menu = ref(false);
const search = ref('');
const items = ref<any[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const selected = ref<any | null>(props.modelValue);

const selectedLabel = computed(() => {
  if (!selected.value) return '';
  return props.columns.map(col => selected.value[col.key]).join(' | ');
});

async function load(reset = false) {
  if (loading.value) return;
  loading.value = true;
  if (reset) {
    page.value = 1;
    items.value = [];
  }
  const { items: newItems, total: newTotal } = await props.fetchReferenceData({
    search: search.value,
    page: page.value,
    pageSize
  });
  items.value = reset ? newItems : [...items.value, ...newItems];
  total.value = newTotal;
  loading.value = false;
}

function onSearch() {
  load(true);
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && items.value.length < total.value) {
    page.value += 1;
    load();
  }
}

function select(item: any) {
  selected.value = item;
  emit('update:modelValue', item);
  menu.value = false;
}

watch(() => props.modelValue, val => {
  selected.value = val;
});

onMounted(() => {
  load(true);
});

function isSelected(item: any) {
  if (!selected.value || !props.template?.joinColumns) return false;
  return props.template.joinColumns.every(joinCol => {
    const pk = joinCol.split('_').slice(1).join('_');
    return selected.value[pk] === item[pk];
  });
}
</script>

<style scoped>
.selected-row {
  background-color: #e0e0e01a;
}
</style>