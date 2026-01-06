<template>
    <!-- Main container for the permission management component -->
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <!-- Skeleton loader displayed while data is loading -->
            <v-skeleton-loader
            v-if="permissionIsLoading"
            elevation="12"
            class="glass-panel w-100"
            type="article, actions, table"/>
            <template v-else>
                <!-- Role-based permission management UI -->
                <v-col cols="12" class="d-flex flex-column">
                    <v-card flat class="rounded-0 transparent">
                        <!-- Card title displaying the entity icon and name -->
                        <v-card-title class="text-white">
                            <v-icon left>{{ permissionEntity?.icon }}</v-icon> {{ $t(`navigation.${permissionEntity?.handle}`) }}
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text class="pa-0 sapling-permission-scroll-area">
                            <!-- Expansion panels for each role, now scrollable -->
                            <div class="sapling-permission-expansion-scroll">
                                <v-expansion-panels v-model="localOpenPanels" multiple @update:modelValue="val => onUpdateOpenPanels(val as number[])">
                                    <v-expansion-panel class="glass-panel"
                                        v-for="role in roles?.data"
                                        :key="role.handle ?? role.title">
                                        <v-expansion-panel-title @click.stop>
                                            <template #actions="{ expanded }">
                                                <v-icon class="sapling-expansion-arrow" :class="{ 'expanded': expanded }">mdi-chevron-down</v-icon>
                                            </template>
                                            <!-- Header row for role details -->
                                            <div class="role-header-row sapling-role-header-row">
                                                <!-- Role title -->
                                                <div class="role-header-label sapling-role-header-label">{{ $t(`navigation.role`) }}</div>
                                                <div class="role-header-value sapling-role-header-value"><v-chip color="primary" class="ma-1" small>{{ role.title }}</v-chip></div>
                                                <!-- Role stage -->
                                                <div class="role-header-label sapling-role-header-label">{{ $t(`role.stage`) }}</div>
                                                <div class="role-header-value sapling-role-header-value"><v-chip class="ma-1" small>{{ getStageTitle(role.stage) }}</v-chip></div>
                                                <!-- Persons assigned to the role -->
                                                <div class="role-header-label sapling-role-header-label">{{ $t(`role.persons`) }}</div>
                                                <div class="role-header-value sapling-role-header-value">
                                                    <!-- Dropdown to add persons to the role -->
                                                    <SaplingSelectAddField
                                                        :label="$t('global.add')"
                                                        entityName="person"
                                                        :modelValue="[]"
                                                        :items="getAvailablePersonsForRole(role)"
                                                        @add-selected="val => val.forEach((person: PersonItem) => addPersonToRole(person, role))"
                                                        class="sapling-add-person-select"
                                                        @mousedown.stop
                                                        @click.stop
                                                    />
                                                    <!-- Chips displaying persons assigned to the role -->
                                                    <div class="role-person-chips sapling-role-person-chips">
                                                        <v-chip
                                                            v-for="person in getPersonsForRole(role)"
                                                            :key="'person-'+person.handle"
                                                            color="secondary"
                                                            small
                                                            style="position: relative;">
                                                            <div style="display: flex; align-items: center; width: 100%; padding-right: 24px;">
                                                                <span class="sapling-person-chip-label">{{ person.firstName }} {{ person.lastName }}</span>
                                                            </div>
                                                            <v-btn icon="mdi-close" size="x-small" class="transparent" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%);" @click.stop="openDeleteDialog(person, role)"/>
                                                        </v-chip>
                                                    </div>
                                                    <!-- Delete confirmation dialog -->
                                                    <SaplingDelete
                                                        v-if="deleteDialog.visible"
                                                        :model-value="deleteDialog.visible"
                                                        :item="deleteDialog.person"
                                                        @update:model-value="val => deleteDialog.visible = val"
                                                        @confirm="confirmRemovePersonFromRole"
                                                        @cancel="cancelRemovePersonFromRole"
                                                    />
                                                </div>
                                            </div>
                                        </v-expansion-panel-title>
                                        <v-expansion-panel-text>
                                            <!-- Tabs by group for entity permissions -->
                                            <v-tabs v-model="role._tab" class="sapling-permission-group-tabs">
                                                <v-tab
                                                    v-for="group in Array.from(new Set((entities?.data||[])
                                                        .filter(e => e.group !== null && e.group !== undefined && (typeof e.group !== 'object' || (e.group && 'handle' in e.group)))
                                                        .map(e => typeof e.group === 'object' && e.group !== null ? e.group.handle : e.group)
                                                    )).filter(g => typeof g === 'string' && g)"
                                                    :key="String(group)"
                                                    :value="String(group)"
                                                >
                                                    {{ $t(`navigationGroup.${group}`) }}
                                                </v-tab>
                                            </v-tabs>
                                            <v-window v-model="role._tab">
                                                <v-window-item
                                                    v-for="group in Array.from(new Set((entities?.data||[])
                                                        .filter(e => e.group !== null && e.group !== undefined && (typeof e.group !== 'object' || (e.group && 'handle' in e.group)))
                                                        .map(e => typeof e.group === 'object' && e.group !== null ? e.group.handle : e.group)
                                                    )).filter(g => typeof g === 'string' && g)"
                                                    :key="String(group)"
                                                    :value="String(group)"
                                                >
                                                    <!-- Table for desktop -->
                                                    <v-table class="glass-table d-none d-md-table" density="compact">
                                                        <thead>
                                                            <tr>
                                                                <th >{{ $t(`navigation.entity`) }}</th>
                                                                <th >{{ $t(`permission.allowShow`) }}</th>
                                                                <th >{{ $t(`permission.allowRead`) }}</th>
                                                                <th >{{ $t(`permission.allowInsert`) }}</th>
                                                                <th >{{ $t(`permission.allowUpdate`) }}</th>
                                                                <th >{{ $t(`permission.allowDelete`) }}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr v-for="item in (entities?.data||[]).filter(e => e.group !== null && e.group !== undefined && (typeof e.group === 'object' && e.group !== null ? e.group.handle : e.group) === group)" :key="item.handle">
                                                                <td>
                                                                    <v-icon v-if="item.icon" left small>{{ item.icon }}</v-icon>
                                                                    {{ $t(`navigation.${item.handle}`) }}
                                                                </td>
                                                                <td class="text-center">
                                                                    <v-checkbox
                                                                        v-if="item.canShow"
                                                                        :model-value="getPermission(role, item, 'allowShow')"
                                                                        @update:model-value="val => setPermission(role, item, 'allowShow', !!val)"
                                                                        hide-details density="compact" :ripple="false"
                                                                    />
                                                                </td>
                                                                <td class="text-center">
                                                                    <v-checkbox
                                                                        v-if="item.canRead"
                                                                        :model-value="getPermission(role, item, 'allowRead')"
                                                                        @update:model-value="val => setPermission(role, item, 'allowRead', !!val)"
                                                                        hide-details density="compact" :ripple="false"
                                                                    />
                                                                </td>
                                                                <td class="text-center">
                                                                    <v-checkbox
                                                                        v-if="item.canInsert"
                                                                        :model-value="getPermission(role, item, 'allowInsert')"
                                                                        @update:model-value="val => setPermission(role, item, 'allowInsert', !!val)"
                                                                        hide-details density="compact" :ripple="false"
                                                                    />
                                                                </td>
                                                                <td class="text-center">
                                                                    <v-checkbox
                                                                        v-if="item.canUpdate"
                                                                        :model-value="getPermission(role, item, 'allowUpdate')"
                                                                        @update:model-value="val => setPermission(role, item, 'allowUpdate', !!val)"
                                                                        hide-details density="compact" :ripple="false"
                                                                    />
                                                                </td>
                                                                <td class="text-center">
                                                                    <v-checkbox
                                                                        v-if="item.canDelete"
                                                                        :model-value="getPermission(role, item, 'allowDelete')"
                                                                        @update:model-value="val => setPermission(role, item, 'allowDelete', !!val)"
                                                                        hide-details density="compact" :ripple="false"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </v-table>
                                                    <!-- Mobile: Card layout -->
                                                    <div class="d-block d-md-none">
                                                        <v-row dense>
                                                            <v-col cols="12" v-for="item in (entities?.data||[]).filter(e => e.group !== null && e.group !== undefined && (typeof e.group === 'object' && e.group !== null ? e.group.handle : e.group) === group)" :key="'mobile-'+item.handle">
                                                                <v-card class="mb-2 glass-panel">
                                                                    <v-card-title>
                                                                        <v-icon v-if="item.icon" left small>{{ item.icon }}</v-icon>
                                                                        {{ $t(`navigation.${item.handle}`) }}
                                                                    </v-card-title>
                                                                    <v-card-text>
                                                                        <div class="sapling-permission-mobile-checkbox">
                                                                            <div v-if="item.canShow">
                                                                                <span>{{ $t(`permission.allowShow`) }}</span>
                                                                                <v-checkbox
                                                                                    :model-value="getPermission(role, item, 'allowShow')"
                                                                                    @update:model-value="val => setPermission(role, item, 'allowShow', !!val)"
                                                                                    hide-details density="compact" :ripple="false"
                                                                                />
                                                                            </div>
                                                                            <div v-if="item.canRead">
                                                                                <span>{{ $t(`permission.allowRead`) }}</span>
                                                                                <v-checkbox
                                                                                    :model-value="getPermission(role, item, 'allowRead')"
                                                                                    @update:model-value="val => setPermission(role, item, 'allowRead', !!val)"
                                                                                    hide-details density="compact" :ripple="false"
                                                                                />
                                                                            </div>
                                                                            <div v-if="item.canInsert">
                                                                                <span>{{ $t(`permission.allowInsert`) }}</span>
                                                                                <v-checkbox
                                                                                    :model-value="getPermission(role, item, 'allowInsert')"
                                                                                    @update:model-value="val => setPermission(role, item, 'allowInsert', !!val)"
                                                                                    hide-details density="compact" :ripple="false"
                                                                                />
                                                                            </div>
                                                                            <div v-if="item.canUpdate">
                                                                                <span>{{ $t(`permission.allowUpdate`) }}</span>
                                                                                <v-checkbox
                                                                                    :model-value="getPermission(role, item, 'allowUpdate')"
                                                                                    @update:model-value="val => setPermission(role, item, 'allowUpdate', !!val)"
                                                                                    hide-details density="compact" :ripple="false"
                                                                                />
                                                                            </div>
                                                                            <div v-if="item.canDelete">
                                                                                <span>{{ $t(`permission.allowDelete`) }}</span>
                                                                                <v-checkbox
                                                                                    :model-value="getPermission(role, item, 'allowDelete')"
                                                                                    @update:model-value="val => setPermission(role, item, 'allowDelete', !!val)"
                                                                                    hide-details density="compact" :ripple="false"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </v-card-text>
                                                                </v-card>
                                                            </v-col>
                                                        </v-row>
                                                    </div>
                                                </v-window-item>
                                            </v-window>
                                            <!-- End Tabs by group -->
                                        </v-expansion-panel-text>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </template>
        </v-row>
    </v-container>
</template>

<script lang="ts" setup>
//#region Import
// Import styles specific to the permission component
import '@/assets/styles/SaplingPermission.css';
// Import the delete dialog component
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
// Import the composable for handling permission logic
import { useSaplingPermission } from '@/composables/account/useSaplingPermission';  
// Import the select add field component for adding persons to roles
import SaplingSelectAddField from '../fields/SaplingSelectAddField.vue';
// Import type definitions
import type { PersonItem } from '@/entity/entity';
//#endregion

//#region Composable
const {
    roles,
    entities,
    permissionEntity,
    permissionIsLoading,
    deleteDialog,
    localOpenPanels,
    getAvailablePersonsForRole,
    addPersonToRole,
    openDeleteDialog,
    cancelRemovePersonFromRole,
    confirmRemovePersonFromRole,
    getStageTitle,
    getPersonsForRole,
    getPermission,
    setPermission,
    onUpdateOpenPanels,
} = useSaplingPermission();

// Ensure each role has a _tab property for tab state
import { watch } from 'vue';
watch(
    () => roles.value?.data,
    (roleList) => {
        if (roleList) {
            for (const role of roleList) {
                if (!('_tab' in role)) {
                    // Default to first group if available
                                            const groups = Array.from(new Set((entities.value?.data||[])
                                                .filter(e => e.group !== null && e.group !== undefined && (typeof e.group !== 'object' || (e.group && 'handle' in e.group)))
                                                .map(e => typeof e.group === 'object' && e.group !== null ? e.group.handle : e.group)
                                            ));
                    role._tab = groups[0] || null;
                }
            }
        }
    },
    { immediate: true }
);
//#endregion
</script>
