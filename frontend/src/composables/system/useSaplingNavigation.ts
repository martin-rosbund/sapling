import { computed, onMounted, ref, watch } from 'vue';
import type { EntityGroupItem, EntityItem, EntityRouteItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

interface SaplingNavigationProps {
  modelValue: boolean;
}

type SaplingNavigationEmit = (event: 'update:modelValue', value: boolean) => void;

interface FilteredNavigationEntry {
  entity: EntityItem;
  routes: EntityRouteItem[];
}

interface FilteredNavigationGroup {
  group: EntityGroupItem;
  entries: FilteredNavigationEntry[];
}

/**
 * Encapsulates navigation loading, permission filtering, search and route handling.
 */
export function useSaplingNavigation(props: SaplingNavigationProps, emit: SaplingNavigationEmit) {
  //#region State
  const { isLoading: isTranslationLoading } = useTranslationLoader('navigation', 'navigationGroup', 'global');
  const { t } = useI18n();
  const router = useRouter();
  const isNavigationLoading = ref(true);
  const isLoading = computed(() => isTranslationLoading.value || isNavigationLoading.value);
  const groups = ref<EntityGroupItem[]>([]);
  const entities = ref<EntityItem[]>([]);
  const entitiesPermissions = ref<AccumulatedPermission[] | null>(null);
  const drawer = ref(props.modelValue);
  const navigationSearch = ref('');
  const expandedPanels = ref<string[]>([]);

  const normalizedSearch = computed(() => normalizeText(navigationSearch.value));
  const defaultExpandedPanels = computed(() => groups.value.filter(group => group.isExpanded).map(group => group.handle));
  const filteredGroups = computed<FilteredNavigationGroup[]>(() => {
    return groups.value.reduce<FilteredNavigationGroup[]>((results, group) => {
      const groupMatches = matchesSearch(getGroupLabel(group.handle), group.handle);
      const entries = getEntitiesByGroup(group.handle)
        .map((entity) => {
          const filterableRoutes = getFilterableRoutes(entity);
          const entityMatches = matchesSearch(getEntityLabel(entity.handle), entity.handle);
          const matchingRoutes = filterableRoutes.filter((route) => {
            if (groupMatches || entityMatches) {
              return true;
            }

            return matchesSearch(
              getRouteLabel(entity, route),
              route.navigation,
              route.route,
              route.handle,
            );
          });

          if (matchingRoutes.length === 0) {
            return null;
          }

          return {
            entity,
            routes: matchingRoutes,
          };
        })
        .filter((entry): entry is FilteredNavigationEntry => entry !== null);

      if (entries.length === 0) {
        return results;
      }

      results.push({
        group,
        entries,
      });

      return results;
    }, []);
  });
  const hasSearchResults = computed(() => filteredGroups.value.length > 0);
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    isNavigationLoading.value = true;

    try {
      await setEntitiesPermissions();
      await fetchGroupsAndEntities();
    } finally {
      isNavigationLoading.value = false;
    }
  });

  watch(() => props.modelValue, val => drawer.value = val);
  watch(drawer, val => emit('update:modelValue', val));

  watch([normalizedSearch, filteredGroups, defaultExpandedPanels], ([search, nextGroups, nextDefaultPanels]) => {
    if (search) {
      expandedPanels.value = nextGroups.map(({ group }) => group.handle);
      return;
    }

    expandedPanels.value = [...nextDefaultPanels];
  }, { immediate: true });
  //#endregion

  //#region Methods
  /**
   * Loads the accumulated permissions for the current user.
   */
  async function setEntitiesPermissions() {
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    entitiesPermissions.value = currentPermissionStore.accumulatedPermission;
  }

  /**
   * Loads all visible navigation entities and their remaining groups.
   */
  async function fetchGroupsAndEntities() {
    entities.value = (await ApiGenericService.find<EntityItem>('entity', {
      filter: { canShow: true },
      relations: ['routes'],
    })).data;

    if (entitiesPermissions.value) {
      entities.value = entities.value.filter(entity => {
        return entitiesPermissions.value?.some(permission => {
          return permission.entityHandle === entity.handle && permission.allowShow;
        });
      });
    }

    groups.value = (await ApiGenericService.find<EntityGroupItem>('entityGroup')).data;

    if (entitiesPermissions.value) {
      const allowedGroupHandles = new Set(entities.value.map(entity => getEntityGroupHandle(entity)).filter(Boolean));
      groups.value = groups.value.filter(group => allowedGroupHandles.has(group.handle));
    }
  }

  /**
   * Returns all navigation entities belonging to one group.
   */
  function getEntitiesByGroup(groupHandle: string) {
    return entities.value.filter(entity => getEntityGroupHandle(entity) === groupHandle);
  }

  /**
   * Resolves the translated label of a navigation group.
   */
  function getGroupLabel(groupHandle: string) {
    return t(`navigationGroup.${groupHandle}`);
  }

  /**
   * Resolves the translated label of an entity.
   */
  function getEntityLabel(entityHandle: string) {
    return t(`navigation.${entityHandle}`);
  }

  /**
   * Resolves the visible label for a route entry.
   */
  function getRouteLabel(entity: EntityItem, route: EntityRouteItem) {
    return route.navigation ? t(`navigation.${route.navigation}`) : getEntityLabel(entity.handle);
  }

  /**
   * Navigates to a selected route if a route path is available.
   */
  async function navigateToRoute(route: EntityRouteItem) {
    if (!route.route) {
      return;
    }

    await router.push(`/${route.route}`);
  }

  function getFilterableRoutes(entity: EntityItem) {
    return (entity.routes ?? []).filter(route => Boolean(route.route));
  }

  function matchesSearch(...values: unknown[]) {
    if (!normalizedSearch.value) {
      return true;
    }

    return values.some(value => normalizeText(value).includes(normalizedSearch.value));
  }

  function normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim().toLocaleLowerCase();
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value).toLocaleLowerCase();
    }

    if (Array.isArray(value)) {
      return value.map(item => normalizeText(item)).filter(Boolean).join(' ');
    }

    return '';
  }

  function getEntityGroupHandle(entity: EntityItem) {
    if (typeof entity.group === 'string') {
      return entity.group;
    }

    if (entity.group && typeof entity.group === 'object' && 'handle' in entity.group) {
      return entity.group.handle;
    }

    return null;
  }
  //#endregion

  //#region Return
  return {
    isLoading,
    groups,
    entities,
    entitiesPermissions,
    drawer,
    navigationSearch,
    expandedPanels,
    filteredGroups,
    hasSearchResults,
    getGroupLabel,
    getRouteLabel,
    getEntitiesByGroup,
    navigateToRoute,
  };
  //#endregion
}
