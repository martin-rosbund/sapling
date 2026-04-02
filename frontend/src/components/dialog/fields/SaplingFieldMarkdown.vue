<template>
  <v-card flat class="sapling-markdown-field">
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
            autocomplete="off"
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

defineEmits(['update:modelValue']);
const { inputValue, panel, emitInput } = useSaplingMarkdownField(props);
</script>

<style scoped src="@/assets/styles/SaplingFieldMarkdown.css"></style>
