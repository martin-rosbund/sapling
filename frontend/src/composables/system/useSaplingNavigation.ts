import { computed, onMounted, ref, toRef, watch } from 'vue';
import type { EntityGroupItem, EntityItem, EntityRouteItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

interface SaplingNavigationProps {
  modelValue: boolean;
  showHint?: boolean;
}

type SaplingNavigationEmit = (event: 'update:modelValue', value: boolean) => void;

interface NavigationRouteEntry {
  route: EntityRouteItem;
  label: string;
  hint: string | null;
  path: string;
  isActive: boolean;
}

interface NavigationEntityEntry {
  entity: EntityItem;
  label: string;
  icon: string;
  routes: NavigationRouteEntry[];
  isActive: boolean;
}

interface NavigationSubgroup {
  group: EntityGroupItem;
  label: string;
  icon: string;
  entities: NavigationEntityEntry[];
  entityCount: number;
  routeCount: number;
  isActive: boolean;
}

interface NavigationTopGroup {
  group: EntityGroupItem;
  label: string;
  icon: string;
  subgroups: NavigationSubgroup[];
  entityCount: number;
  routeCount: number;
  isActive: boolean;
}

interface NavigationSummary {
  groupCount: number;
  subgroupCount: number;
  entityCount: number;
  routeCount: number;
}

/**
 * Encapsulates navigation loading, permission filtering, search and route handling.
 */
export function useSaplingNavigation(props: SaplingNavigationProps, emit: SaplingNavigationEmit) {
  //#region State
  const modelValue = toRef(props, 'modelValue');
  const { isLoading: isTranslationLoading } = useTranslationLoader(
    'navigation',
    'navigationGroup',
    ...(props.showHint ? ['navigationHint'] : []),
    'global',
  );
  const { t, te } = useI18n();
  const router = useRouter();
  const currentRoute = useRoute();
  const isNavigationLoading = ref(true);
  const isLoading = computed(() => isTranslationLoading.value || isNavigationLoading.value);
  const groups = ref<EntityGroupItem[]>([]);
  const entities = ref<EntityItem[]>([]);
  const entitiesPermissions = ref<AccumulatedPermission[] | null>(null);
  const drawer = ref(props.modelValue);
  const navigationSearch = ref('');
  const expandedGroups = ref<string[]>([]);
  const expandedSubgroups = ref<string[]>([]);

  const normalizedSearch = computed(() => normalizeText(navigationSearch.value));
  const currentPath = computed(() => currentRoute.path.replace(/^\/+/, ''));
  const navigationGroups = computed<NavigationTopGroup[]>(() => {
    const topLevelGroups = sortGroups(
      groups.value.filter((group) => !getGroupParentHandle(group)),
    );

    return topLevelGroups
      .map((group) => {
        const subgroups = sortGroups(
          groups.value.filter((candidate) => getGroupParentHandle(candidate) === group.handle),
        )
          .map((subgroup) => buildNavigationSubgroup(subgroup))
          .filter((subgroup): subgroup is NavigationSubgroup => subgroup !== null);

        const directEntities = buildEntityEntries(group.handle);
        if (directEntities.length > 0) {
          subgroups.unshift(createDirectSubgroup(group, directEntities));
        }

        if (subgroups.length === 0) {
          return null;
        }

        return {
          group,
          label: getGroupLabel(group.handle),
          icon: group.icon || 'mdi-view-grid-outline',
          subgroups,
          entityCount: subgroups.reduce((sum, subgroup) => sum + subgroup.entityCount, 0),
          routeCount: subgroups.reduce((sum, subgroup) => sum + subgroup.routeCount, 0),
          isActive: subgroups.some((subgroup) => subgroup.isActive),
        };
      })
      .filter((group): group is NavigationTopGroup => group !== null);
  });
  const filteredGroups = computed<NavigationTopGroup[]>(() => {
    if (!normalizedSearch.value) {
      return navigationGroups.value;
    }

    return navigationGroups.value
      .map((group) => filterNavigationGroup(group))
      .filter((group): group is NavigationTopGroup => group !== null);
  });
  const defaultExpandedGroups = computed(() => {
    return navigationGroups.value
      .filter((group) => group.group.isExpanded || group.isActive)
      .map((group) => group.group.handle);
  });
  const defaultExpandedSubgroups = computed(() => {
    return navigationGroups.value.flatMap((group) => {
      return group.subgroups
        .filter((subgroup) => subgroup.group.isExpanded || subgroup.isActive)
        .map((subgroup) => subgroup.group.handle);
    });
  });
  const navigationSummary = computed<NavigationSummary>(() => {
    return {
      groupCount: navigationGroups.value.length,
      subgroupCount: navigationGroups.value.reduce((sum, group) => sum + group.subgroups.length, 0),
      entityCount: navigationGroups.value.reduce((sum, group) => sum + group.entityCount, 0),
      routeCount: navigationGroups.value.reduce((sum, group) => sum + group.routeCount, 0),
    };
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

  watch(modelValue, (value) => {
    drawer.value = value;
  });
  watch(drawer, (value) => emit('update:modelValue', value));

  watch(
    [normalizedSearch, filteredGroups, defaultExpandedGroups, defaultExpandedSubgroups],
    ([search, nextGroups, nextDefaultGroups, nextDefaultSubgroups]) => {
      if (search) {
        expandedGroups.value = nextGroups.map((group) => group.group.handle);
        expandedSubgroups.value = nextGroups.flatMap((group) => {
          return group.subgroups.map((subgroup) => subgroup.group.handle);
        });
        return;
      }

      expandedGroups.value = [...nextDefaultGroups];
      expandedSubgroups.value = [...nextDefaultSubgroups];
    },
    { immediate: true },
  );
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
   * Loads all visible navigation entities and the group hierarchy that contains them.
   */
  async function fetchGroupsAndEntities() {
    entities.value = (await ApiGenericService.find<EntityItem>('entity', {
      filter: { canShow: true },
      relations: ['routes', 'group', 'group.parent'],
    })).data;

    if (entitiesPermissions.value) {
      entities.value = entities.value.filter((entity) => {
        return entitiesPermissions.value?.some((permission) => {
          return permission.entityHandle === entity.handle && permission.allowShow;
        });
      });
    }

    const nextGroups = (await ApiGenericService.find<EntityGroupItem>('entityGroup', {
      relations: ['parent'],
    })).data;

    const visibleGroupHandles = collectVisibleGroupHandles(nextGroups, entities.value);
    groups.value = nextGroups.filter((group) => visibleGroupHandles.has(group.handle));
  }

  /**
   * Resolves the translated label of a navigation group.
   */
  function getGroupLabel(groupHandle: string) {
    return getTranslatedLabel('navigationGroup', groupHandle);
  }

  /**
   * Resolves the translated label of an entity.
   */
  function getEntityLabel(entityHandle: string) {
    return getTranslatedLabel('navigation', entityHandle);
  }

  /**
   * Resolves the visible label for a route entry.
   */
  function getRouteLabel(entity: EntityItem, route: EntityRouteItem) {
    return route.navigation
      ? getTranslatedLabel('navigation', route.navigation, getEntityLabel(entity.handle))
      : getEntityLabel(entity.handle);
  }

  /**
   * Resolves the short hint shown below a route label.
   */
  function getRouteHint(entity: EntityItem, route: EntityRouteItem) {
    if (!props.showHint) {
      return null;
    }

    const hint = route.hint?.trim();
    if (!hint) {
      return null;
    }

    const key = route.navigation
      ? `navigationHint.${entity.handle}.${route.navigation}.${hint}`
      : `navigationHint.${entity.handle}.${hint}`;

    return te(key) ? t(key) : null;
  }

  /**
   * Navigates to a selected route if a route path is available.
   */
  async function navigateToRoute(route: EntityRouteItem) {
    if (!route.route) {
      return;
    }

    await router.push(`/${route.route}`);
    drawer.value = false;
  }

  function onDrawerUpdate(value: boolean) {
    drawer.value = value;
  }

  function toggleGroup(groupHandle: string) {
    expandedGroups.value = toggleHandle(expandedGroups.value, groupHandle);
  }

  function toggleSubgroup(groupHandle: string) {
    expandedSubgroups.value = toggleHandle(expandedSubgroups.value, groupHandle);
  }

  function isGroupExpanded(groupHandle: string) {
    return expandedGroups.value.includes(groupHandle);
  }

  function isSubgroupExpanded(groupHandle: string) {
    return expandedSubgroups.value.includes(groupHandle);
  }

  function buildNavigationSubgroup(group: EntityGroupItem): NavigationSubgroup | null {
    const nextEntities = buildEntityEntries(group.handle);
    if (nextEntities.length === 0) {
      return null;
    }

    return {
      group,
      label: getGroupLabel(group.handle),
      icon: group.icon || 'mdi-folder-outline',
      entities: nextEntities,
      entityCount: nextEntities.length,
      routeCount: nextEntities.reduce((sum, entity) => sum + entity.routes.length, 0),
      isActive: nextEntities.some((entity) => entity.isActive),
    };
  }

  function createDirectSubgroup(group: EntityGroupItem, nextEntities: NavigationEntityEntry[]): NavigationSubgroup {
    return {
      group,
      label: getGroupLabel(group.handle),
      icon: group.icon || 'mdi-folder-outline',
      entities: nextEntities,
      entityCount: nextEntities.length,
      routeCount: nextEntities.reduce((sum, entity) => sum + entity.routes.length, 0),
      isActive: nextEntities.some((entity) => entity.isActive),
    };
  }

  function buildEntityEntries(groupHandle: string): NavigationEntityEntry[] {
    return entities.value
      .filter((entity) => getEntityGroupHandle(entity) === groupHandle)
      .sort((left, right) => getEntityLabel(left.handle).localeCompare(getEntityLabel(right.handle)))
      .map((entity) => {
        const routes = getFilterableRoutes(entity)
          .map((item) => buildRouteEntry(entity, item))
          .filter((entry): entry is NavigationRouteEntry => entry !== null);

        if (routes.length === 0) {
          return null;
        }

        return {
          entity,
          label: getEntityLabel(entity.handle),
          icon: entity.icon || 'mdi-square-rounded',
          routes,
          isActive: routes.some((routeEntry) => routeEntry.isActive),
        };
      })
      .filter((entry): entry is NavigationEntityEntry => entry !== null);
  }

  function buildRouteEntry(entity: EntityItem, item: EntityRouteItem): NavigationRouteEntry | null {
    const path = item.route?.replace(/^\/+/, '') ?? '';
    if (!path) {
      return null;
    }

    return {
      route: item,
      label: getRouteLabel(entity, item),
      hint: getRouteHint(entity, item),
      path,
      isActive: isPathActive(path),
    };
  }

  function filterNavigationGroup(group: NavigationTopGroup): NavigationTopGroup | null {
    const groupMatches = matchesSearch(group.label, group.group.handle);
    const subgroups = group.subgroups
      .map((subgroup) => filterNavigationSubgroup(subgroup, groupMatches))
      .filter((subgroup): subgroup is NavigationSubgroup => subgroup !== null);

    if (subgroups.length === 0) {
      return null;
    }

    return {
      ...group,
      subgroups,
      entityCount: subgroups.reduce((sum, subgroup) => sum + subgroup.entityCount, 0),
      routeCount: subgroups.reduce((sum, subgroup) => sum + subgroup.routeCount, 0),
      isActive: subgroups.some((subgroup) => subgroup.isActive),
    };
  }

  function filterNavigationSubgroup(subgroup: NavigationSubgroup, parentMatches: boolean): NavigationSubgroup | null {
    const subgroupMatches = parentMatches || matchesSearch(subgroup.label, subgroup.group.handle);
    const nextEntities = subgroup.entities
      .map((entity) => filterNavigationEntity(entity, subgroupMatches))
      .filter((entity): entity is NavigationEntityEntry => entity !== null);

    if (nextEntities.length === 0) {
      return null;
    }

    return {
      ...subgroup,
      entities: nextEntities,
      entityCount: nextEntities.length,
      routeCount: nextEntities.reduce((sum, entity) => sum + entity.routes.length, 0),
      isActive: nextEntities.some((entity) => entity.isActive),
    };
  }

  function filterNavigationEntity(entity: NavigationEntityEntry, parentMatches: boolean): NavigationEntityEntry | null {
    const entityMatches = parentMatches || matchesSearch(entity.label, entity.entity.handle);
    const routes = entity.routes.filter((routeEntry) => {
      if (entityMatches) {
        return true;
      }

      return matchesSearch(
        routeEntry.label,
        routeEntry.path,
        routeEntry.route.navigation,
        routeEntry.route.handle,
      );
    });

    if (routes.length === 0) {
      return null;
    }

    return {
      ...entity,
      routes,
      isActive: routes.some((routeEntry) => routeEntry.isActive),
    };
  }

  function getFilterableRoutes(entity: EntityItem) {
    return [...(entity.routes ?? [])].filter((route) => Boolean(route.route));
  }

  function collectVisibleGroupHandles(nextGroups: EntityGroupItem[], nextEntities: EntityItem[]) {
    const groupMap = new Map(nextGroups.map((group) => [group.handle, group]));
    const visibleHandles = new Set<string>();

    nextEntities.forEach((entity) => {
      let nextHandle = getEntityGroupHandle(entity);

      while (nextHandle) {
        visibleHandles.add(nextHandle);
        nextHandle = getGroupParentHandle(groupMap.get(nextHandle));
      }
    });

    return visibleHandles;
  }

  function matchesSearch(...values: unknown[]) {
    if (!normalizedSearch.value) {
      return true;
    }

    return values.some((value) => normalizeText(value).includes(normalizedSearch.value));
  }

  function normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim().toLocaleLowerCase();
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value).toLocaleLowerCase();
    }

    if (Array.isArray(value)) {
      return value.map((item) => normalizeText(item)).filter(Boolean).join(' ');
    }

    return '';
  }

  function sortGroups(nextGroups: EntityGroupItem[]) {
    return [...nextGroups].sort((left, right) => {
      const sortOrderDifference = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      if (sortOrderDifference !== 0) {
        return sortOrderDifference;
      }

      return getGroupLabel(left.handle).localeCompare(getGroupLabel(right.handle));
    });
  }

  function isPathActive(path: string) {
    return currentPath.value === path || currentPath.value.startsWith(`${path}/`);
  }

  function getTranslatedLabel(namespace: 'navigation' | 'navigationGroup' | 'navigationHint', handle: string, fallback?: string) {
    const key = `${namespace}.${handle}`;
    if (te(key)) {
      return t(key);
    }

    return fallback ?? humanizeHandle(handle);
  }

  function humanizeHandle(handle: string) {
    return handle
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (character) => character.toUpperCase());
  }

  function toggleHandle(currentHandles: string[], handle: string) {
    return currentHandles.includes(handle)
      ? currentHandles.filter((item) => item !== handle)
      : [...currentHandles, handle];
  }

  function getGroupParentHandle(group?: EntityGroupItem | null) {
    if (!group) {
      return null;
    }

    if (typeof group.parent === 'string') {
      return group.parent;
    }

    if (group.parent && typeof group.parent === 'object' && 'handle' in group.parent) {
      return group.parent.handle;
    }

    return null;
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
    drawer,
    navigationSearch,
    expandedGroups,
    expandedSubgroups,
    filteredGroups,
    navigationSummary,
    hasSearchResults,
    onDrawerUpdate,
    toggleGroup,
    toggleSubgroup,
    isGroupExpanded,
    isSubgroupExpanded,
    navigateToRoute,
  };
  //#endregion
}
