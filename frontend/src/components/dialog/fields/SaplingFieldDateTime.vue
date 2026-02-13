<template>
  <v-row dense>
    <v-col :cols="8">
      <v-date-input
        :label="computedLabel"
        :model-value="dateValue"
        :disabled="isDisabled"
        :rules="rules"
        @update:model-value="updateDate"
      />
    </v-col>
    <v-col :cols="4">
      <v-text-field
        type="time"
        :label="computedLabel"
        :model-value="timeValue"
        :disabled="isDisabled"
        :rules="rules"
        @update:model-value="updateTime"
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
  import { useSaplingDateTimeField } from '@/composables/fields/useSaplingDateTimeField';

  const props = defineProps<{
    dateValue: string;
    timeValue: string;
    label: string;
    disabled?: boolean;
    rules?: ((value: string) => boolean | string)[];
    required?: boolean;
  }>();
  
  const emit = defineEmits(['update:dateValue', 'update:timeValue']);

  const { computedLabel, isDisabled, updateDate, updateTime } = useSaplingDateTimeField(props, emit);
</script>
