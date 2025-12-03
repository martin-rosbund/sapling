<template>
  <v-menu v-model="searchMenu" :close-on-content-click="false" offset-y>
    <template v-slot:activator="{ props }">
      <v-text-field
        v-model="searchQuery"
        :placeholder="AI_AGENT_NAME"
        hide-details
        density="compact"
        style="vertical-align: middle;"
        prepend-inner-icon="mdi-face-agent"
        v-bind="props"
        @click="searchMenu = true"
        readonly
      />
    </template>
    <v-card style="padding: 16px;" class="glass-panel">
      <v-form @submit.prevent="onSearch">
        <v-textarea
          v-model="searchQuery"
          :label="$t('agent.task') + '*'"
          :rules="[v => !!v || $t('agent.task') + ' ' + $t('global.isRequired')]"
          hide-details
          density="compact"
          style="margin-bottom: 16px;"
          autofocus
          :rows="4"
        />
        <v-select
          v-model="selectedEntity"
          :menu-props="{ contentClass: 'glass-menu'}"
          :items="entityOptions"
          :label="$t('navigation.entity') + '*'"
          :rules="[v => !!v || $t('navigation.entity') + ' ' + $t('global.isRequired')]"
          hide-details
          density="compact"
          style="margin-bottom: 16px;"
        />
        <v-btn type="submit" color="primary" block>Start</v-btn>
      </v-form>
    </v-card>
  </v-menu>
</template>

<script lang="ts" setup>
	// #region Imports
  // Import the composable for handling Sapling Agent logic
  import { useSaplingAgent } from '@/composables/useSaplingAgent';
  // Import the constant for the AI agent name
  import { AI_AGENT_NAME } from '@/constants/project.constants';
	// #endregion

	// #region Composable
  const {
    searchMenu,
    searchQuery,
    selectedEntity,
    entityOptions,
    onSearch,
  } = useSaplingAgent();
	// #endregion
</script>
