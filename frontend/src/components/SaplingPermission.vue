<template>
    <!-- Main container for the permission management component -->
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <!-- Skeleton loader displayed while data is loading -->
            <v-skeleton-loader
            v-if="isLoading"
            elevation="12"
            class="sapling-skeleton-loader glass-panel"
            type="article, actions, table"/>
            <template v-else>
                <!-- Role-based permission management UI -->
                <v-col cols="12" class="d-flex flex-column">
                    <v-card flat class="rounded-0 transparent">
                        <!-- Card title displaying the entity icon and name -->
                        <v-card-title class="text-white">
                            <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.${entity?.handle}`) }}
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text class="pa-0">
                            <!-- Expansion panels for each role -->
                            <v-expansion-panels v-model="localOpenPanels" multiple @update:modelValue="val => onUpdateOpenPanels(val as number[])">
                                <v-expansion-panel class="glass-panel"
                                    v-for="role in roles"
                                    :key="role.handle ?? role.title">
                                    <v-expansion-panel-title>
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
                                                <v-select
                                                    v-model="addPersonSelectModels[String(role.handle)]"
                                                    :items="getAvailablePersonsForRole(role)"
                                                    :menu-props="{ contentClass: 'glass-menu'}"
                                                    item-title="fullName"
                                                    item-value="handle"
                                                    :label="$t('global.add')"
                                                    dense
                                                    hide-details
                                                    @update:model-value="val => addPersonToRole(val, role)"
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
                                        <v-table class="glass-table" density="compact">
                                            <thead>
                                                <tr>
                                                    <th style="width:140px">{{ $t(`navigation.entity`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowShow`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowRead`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowInsert`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowUpdate`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowDelete`) }}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="item in entities" :key="item.handle">
                                                    <!-- Entity name and icon -->
                                                    <td>
                                                        <v-icon v-if="item.icon" left small>{{ item.icon }}</v-icon>
                                                        {{ $t(`navigation.${item.handle}`) }}
                                                    </td>
                                                    <!-- Permission checkboxes for each entity -->
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
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </v-card-text>
                    </v-card>
                </v-col>
            </template>
        </v-row>
    </v-container>
</template>

<script lang="ts" setup>
// Import styles specific to the permission component
import '@/assets/styles/SaplingRight.css';
// Import the delete dialog component
import SaplingDelete from './dialog/SaplingDelete.vue';
import { toRefs } from 'vue'; // Import Vue utilities for reactivity
import type { RoleItem, EntityItem, PersonItem, RoleStageItem } from '@/entity/entity'; // Import types for type safety

// Define the props passed to the component
const props = defineProps<{
    roles: RoleItem[], // List of roles to display
    entities: EntityItem[], // List of entities to manage permissions for
    entity: EntityItem | null, // Currently selected entity
    openPanels: number[], // List of open expansion panels
    isLoading: boolean, // Loading state
    addPersonSelectModels: Record<string, number|null>, // Models for adding persons to roles
    deleteDialog: { visible: boolean, person: PersonItem | null, role: RoleItem | null }, // State for the delete dialog
    getAvailablePersonsForRole: (role: RoleItem) => PersonItem[], // Function to get available persons for a role
    getPersonsForRole: (role: RoleItem) => PersonItem[], // Function to get persons assigned to a role
    getStageTitle: (stage: RoleStageItem | string) => string, // Function to get the title of a role stage
    getPermission: (role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'|'allowShow') => boolean, // Function to get a permission
}>();

// Define the events emitted by the component
const emit = defineEmits([
    'add-person-to-role', // Event emitted when a person is added to a role
    'open-delete-dialog', // Event emitted to open the delete dialog
    'cancel-remove-person-from-role', // Event emitted to cancel removing a person from a role
    'confirm-remove-person-from-role', // Event emitted to confirm removing a person from a role
    'set-permission', // Event emitted to set a permission
    'update:openPanels', // Event emitted to update the open panels
]);

// Destructure props for easier usage
const { roles, entities, entity, openPanels, isLoading, addPersonSelectModels, deleteDialog } = toRefs(props);
import { ref, watch } from 'vue'; // Import Vue utilities for reactivity

// Local state for managing open panels
const localOpenPanels = ref<number[]>([...openPanels.value]);
watch(openPanels, (val) => {
    localOpenPanels.value = [...val];
});

// Function to update the open panels state
function onUpdateOpenPanels(val: number[]) {
    localOpenPanels.value = [...val];
    emit('update:openPanels', val);
}

// Function to add a person to a role
function addPersonToRole(val: number, role: RoleItem) {
    emit('add-person-to-role', val, role);
}

// Function to open the delete dialog
function openDeleteDialog(person: PersonItem, role: RoleItem) {
    emit('open-delete-dialog', person, role);
}

// Function to cancel removing a person from a role
function cancelRemovePersonFromRole() {
    emit('cancel-remove-person-from-role');
}

// Function to confirm removing a person from a role
function confirmRemovePersonFromRole() {
    emit('confirm-remove-person-from-role');
}

// Function to set a permission for a role and entity
function setPermission(role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'|'allowShow', value: boolean) {
    emit('set-permission', role, item, type, value);
}
</script>
