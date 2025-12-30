<template>
  <v-card flat class="sapling-markdown-field transparent">
    <v-expansion-panels variant="accordion" class="mb-2" v-model="panel" multiple>
      <v-expansion-panel class="glass-panel">
        <v-expansion-panel-title>
          {{ label }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-textarea
            v-model="inputValue"
            :label="label"
            :rows="rows"
            :auto-grow="true"
            class="mb-2"
            @input="emitInput"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <div v-if="showPreview" class="sapling-markdown-preview">
      <vue-markdown-render :source="inputValue" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import VueMarkdownRender from 'vue-markdown-render';
import { useSaplingMarkdownField } from '@/composables/fields/useSaplingMarkdownField';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Markdown',
  },
  rows: {
    type: Number,
    default: 6,
  },
  showPreview: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue']);
const { inputValue, panel, emitInput } = useSaplingMarkdownField(props);
</script>

<style scoped>
.sapling-markdown-field {
  width: 100%;
}

.sapling-markdown-preview {
  padding: 1em;
  min-height: 80px;
  font-size: 1em;
}
</style>
