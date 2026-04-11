<template>
  <v-navigation-drawer
    :model-value="drawer"
    temporary
    scrim
    location="left"
    width="430"
    class="sapling-navigation-drawer"
    @update:modelValue="onDrawerUpdate">
    <div class="sapling-navigation-shell">
      <div class="sapling-navigation-shell__hero">
        <div class="sapling-navigation-shell__headline">Navigation</div>
        <div class="sapling-navigation-shell__summary">
          <span>{{ navigationSummary.groupCount }} {{ $t('global.sections') }}</span>
          <span>{{ navigationSummary.subgroupCount }} {{ $t('global.groups') }}</span>
          <span>{{ navigationSummary.entityCount }} {{ $t('global.entities') }}</span>
        </div>
      </div>

      <v-text-field
        v-model="navigationSearch"
        class="sapling-navigation-shell__search"
        clearable
        density="comfortable"
        hide-details
        prepend-inner-icon="mdi-magnify"
        rounded="xl"
        :disabled="isLoading"
        :placeholder="isLoading ? '' : $t('global.search')" />

      <div v-if="isLoading" class="sapling-navigation-shell__loading">
        <v-skeleton-loader
          v-for="item in 4"
          :key="item"
          class="sapling-navigation-shell__skeleton"
          type="article"
        />
      </div>

      <div v-else-if="hasSearchResults" class="sapling-navigation-shell__content">
        <section
          v-for="groupResult in filteredGroups"
          :key="groupResult.group.handle"
          class="sapling-navigation-section"
          :class="{ 'sapling-navigation-section--active': groupResult.isActive }">
          <button
            class="sapling-navigation-section__trigger"
            type="button"
            :aria-expanded="isGroupExpanded(groupResult.group.handle)"
            @click="toggleGroup(groupResult.group.handle)">
            <span class="sapling-navigation-section__copy">
              <span class="sapling-navigation-section__icon">
                <v-icon :icon="groupResult.icon"></v-icon>
              </span>
              <span class="sapling-navigation-section__text">
                <span class="sapling-navigation-section__label">{{ groupResult.label }}</span>
                <span class="sapling-navigation-section__caption">
                  {{ groupResult.entityCount }} {{ $t('global.items') }} · {{ groupResult.routeCount }} {{ $t('global.routes') }}
                </span>
              </span>
            </span>
            <span class="sapling-navigation-section__actions">
              <v-chip size="small" variant="tonal">{{ groupResult.routeCount }}</v-chip>
              <v-icon
                :icon="isGroupExpanded(groupResult.group.handle) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              ></v-icon>
            </span>
          </button>

          <v-expand-transition>
            <div v-show="isGroupExpanded(groupResult.group.handle)" class="sapling-navigation-section__body">
              <article
                v-for="subgroup in groupResult.subgroups"
                :key="subgroup.group.handle"
                class="sapling-navigation-subgroup"
                :class="{ 'sapling-navigation-subgroup--active': subgroup.isActive }">
                <button
                  class="sapling-navigation-subgroup__trigger"
                  type="button"
                  :aria-expanded="isSubgroupExpanded(subgroup.group.handle)"
                  @click="toggleSubgroup(subgroup.group.handle)">
                  <span class="sapling-navigation-subgroup__copy">
                    <v-icon :icon="subgroup.icon" size="18"></v-icon>
                    <span>{{ subgroup.label }}</span>
                  </span>
                  <span class="sapling-navigation-subgroup__actions">
                    <v-chip size="x-small" variant="outlined">{{ subgroup.entityCount }}</v-chip>
                    <v-icon
                      size="18"
                      :icon="isSubgroupExpanded(subgroup.group.handle) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    ></v-icon>
                  </span>
                </button>

                <v-expand-transition>
                  <div v-show="isSubgroupExpanded(subgroup.group.handle)" class="sapling-navigation-subgroup__entries">
                    <article
                      v-for="entry in subgroup.entities"
                      :key="entry.entity.handle"
                      class="sapling-navigation-entity"
                      :class="{ 'sapling-navigation-entity--active': entry.isActive }">
                      <button
                        v-if="entry.routes.length === 1"
                        class="sapling-navigation-entity__single"
                        type="button"
                        @click="navigateToRoute(entry.routes[0].route)">
                        <span class="sapling-navigation-entity__single-copy">
                          <span class="sapling-navigation-entity__icon">
                            <v-icon :icon="entry.icon"></v-icon>
                          </span>
                          <span class="sapling-navigation-entity__text">
                            <span class="sapling-navigation-entity__title">{{ entry.routes[0].label }}</span>
                            <span v-if="entry.routes[0].hint" class="sapling-navigation-entity__subtitle">{{ entry.routes[0].hint }}</span>
                          </span>
                        </span>
                        <v-icon icon="mdi-arrow-top-right" size="18"></v-icon>
                      </button>

                      <div v-else class="sapling-navigation-entity__multi">
                        <div class="sapling-navigation-entity__header">
                          <span class="sapling-navigation-entity__single-copy">
                            <span class="sapling-navigation-entity__icon">
                              <v-icon :icon="entry.icon"></v-icon>
                            </span>
                            <span class="sapling-navigation-entity__text">
                              <span class="sapling-navigation-entity__title">{{ entry.label }}</span>
                              <span class="sapling-navigation-entity__subtitle">{{ entry.routes.length }} {{ $t('global.routes') }}</span>
                            </span>
                          </span>
                        </div>

                        <div class="sapling-navigation-entity__routes">
                          <button
                            v-for="routeEntry in entry.routes"
                            :key="routeEntry.path"
                            class="sapling-navigation-route"
                            :class="{ 'sapling-navigation-route--active': routeEntry.isActive }"
                            type="button"
                            @click="navigateToRoute(routeEntry.route)">
                            <span>{{ routeEntry.label }}</span>
                            <v-icon icon="mdi-chevron-right" size="16"></v-icon>
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                </v-expand-transition>
              </article>
            </div>
          </v-expand-transition>
        </section>
      </div>

      <div v-else class="sapling-navigation-shell__empty">
        <v-icon icon="mdi-compass-off-outline" size="32"></v-icon>
        <div>No matching navigation entries.</div>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingNavigation } from '@/composables/system/useSaplingNavigation';
// #endregion

// #region Props & Emits
const props = withDefaults(defineProps<{
  modelValue: boolean;
  showHint?: boolean;
}>(), {
  showHint: true,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
// #endregion

// #region Composable
const {
  isLoading,
  drawer,
  navigationSearch,
  filteredGroups,
  navigationSummary,
  hasSearchResults,
  onDrawerUpdate,
  toggleGroup,
  toggleSubgroup,
  isGroupExpanded,
  isSubgroupExpanded,
  navigateToRoute,
} = useSaplingNavigation(props, emit);
// #endregion

</script>

<style scoped src="@/assets/styles/SaplingNavigation.css"></style>