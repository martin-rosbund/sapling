<template>
  <!-- Agent launcher input and task form -->
  <v-menu v-model="searchMenu" :close-on-content-click="false" offset-y>
    <template #activator="{ props }">
      <v-text-field
        v-model="searchQuery"
        :placeholder="AI_AGENT_NAME"
        hide-details
        density="compact"
        prepend-inner-icon="mdi-face-agent"
        style="vertical-align: middle"
        v-bind="props"
        @click="openMenu"
        readonly
      />
    </template>

    <v-card class="glass-panel pa-4">
      <v-form @submit.prevent="onSearch">
        <v-textarea
          v-model="searchQuery"
          :label="$t('agent.task') + '*'"
          :rules="taskRules"
          :loading="isLoading"
          hide-details="auto"
          density="compact"
          autofocus
          :rows="4"
          class="mb-4"
        />
        <v-select
          v-model="selectedEntity"
          :items="entityOptions"
          :label="$t('navigation.entity') + '*'"
          :rules="entityRules"
          :loading="isEntityLoading"
          hide-details="auto"
          density="compact"
          class="mb-4"
        />
        <v-btn type="submit" color="primary" block :disabled="!canSubmit">Start</v-btn>
      </v-form>
    </v-card>
  </v-menu>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingAgent } from '@/composables/system/useSaplingAgent'
import { AI_AGENT_NAME } from '@/constants/project.constants'
// #endregion

// #region Composable
const {
  isLoading,
  isEntityLoading,
  searchMenu,
  searchQuery,
  selectedEntity,
  entityOptions,
  canSubmit,
  taskRules,
  entityRules,
  openMenu,
  onSearch,
} = useSaplingAgent()
// #endregion
</script>
