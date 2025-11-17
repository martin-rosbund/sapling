<template>
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <v-skeleton-loader
            v-if="isLoading"
            elevation="12"
            class="sapling-skeleton-loader"
            type="article, actions, table"/>
            <template v-else>
                <!-- Neue rollenbasierte Rechteverwaltung -->
                <v-col cols="12" class="d-flex flex-column">
                    <v-card flat class="rounded-0">
                        <v-card-title class="bg-primary text-white">
                            <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.${entity?.handle}`) }}
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text class="pa-0">
                            <v-expansion-panels v-model="localOpenPanels" multiple @update:modelValue="val => onUpdateOpenPanels(val as number[])">
                                <v-expansion-panel
                                    v-for="role in roles"
                                    :key="role.handle ?? role.title">
                                    <v-expansion-panel-title>
                                        <div class="role-header-row sapling-role-header-row">
                                            <div class="role-header-label sapling-role-header-label">{{ $t(`navigation.role`) }}</div>
                                            <div class="role-header-value sapling-role-header-value"><v-chip color="primary" class="ma-1" small>{{ role.title }}</v-chip></div>
                                            <div class="role-header-label sapling-role-header-label">{{ $t(`role.stage`) }}</div>
                                            <div class="role-header-value sapling-role-header-value"><v-chip class="ma-1" small>{{ getStageTitle(role.stage) }}</v-chip></div>
                                            <div class="role-header-label sapling-role-header-label">{{ $t(`role.persons`) }}</div>
                                            <div class="role-header-value sapling-role-header-value">
                                                <v-select
                                                    v-model="addPersonSelectModels[String(role.handle)]"
                                                    :items="getAvailablePersonsForRole(role)"
                                                    item-title="fullName"
                                                    item-value="handle"
                                                    :label="$t('global.add')"
                                                    dense
                                                    hide-details
                                                    @update:model-value="val => addPersonToRole(val, role)"
                                                    :menu-props="{ maxHeight: '200px' }"
                                                    class="sapling-add-person-select"
                                                    @mousedown.stop
                                                    @click.stop
                                                />
                                                <div class="role-person-chips sapling-role-person-chips">
                                                    <v-chip
                                                        v-for="person in getPersonsForRole(role)"
                                                        :key="'person-'+person.handle"
                                                        color="secondary"
                                                        small
                                                    >
                                                        <span class="sapling-person-chip-label">{{ person.firstName }} {{ person.lastName }}</span>
                                                        <v-btn icon size="x-small" @click.stop="openDeleteDialog(person, role)"><v-icon small>mdi-close</v-icon></v-btn>
                                                    </v-chip>
                                                </div>
                                                <SaplingDelete
                                                    v-if="deleteDialog.visible"
                                                    :model-value="deleteDialog.visible"
                                                    :item="deleteDialog.person as unknown as FormType"
                                                    @update:model-value="val => deleteDialog.visible = val"
                                                    @confirm="confirmRemovePersonFromRole"
                                                    @cancel="cancelRemovePersonFromRole"
                                                />
                                            </div>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text>
                                        <v-table class="elevation-0" density="compact">
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
import '@/assets/styles/SaplingRight.css';
import SaplingDelete from './dialog/SaplingDelete.vue';
import { toRefs } from 'vue';
import type { RoleItem, EntityItem, PersonItem, RoleStageItem } from '@/entity/entity';

const props = defineProps<{
    roles: RoleItem[],
    entities: EntityItem[],
    entity: EntityItem | null,
    openPanels: number[],
    isLoading: boolean,
    addPersonSelectModels: Record<string, number|null>,
    deleteDialog: { visible: boolean, person: PersonItem | null, role: RoleItem | null },
    getAvailablePersonsForRole: (role: RoleItem) => PersonItem[],
    getPersonsForRole: (role: RoleItem) => PersonItem[],
    getStageTitle: (stage: RoleStageItem | string) => string,
    getPermission: (role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'|'allowShow') => boolean,
}>();

const emit = defineEmits([
    'add-person-to-role',
    'open-delete-dialog',
    'cancel-remove-person-from-role',
    'confirm-remove-person-from-role',
    'set-permission',
    'update:openPanels',
]);

const { roles, entities, entity, openPanels, isLoading, addPersonSelectModels, deleteDialog } = toRefs(props);
import { ref, watch } from 'vue';
import type { FormType } from '@/entity/structure';
const localOpenPanels = ref<number[]>([...openPanels.value]);
watch(openPanels, (val) => {
    localOpenPanels.value = [...val];
});
function onUpdateOpenPanels(val: number[]) {
    localOpenPanels.value = [...val];
    emit('update:openPanels', val);
}

function addPersonToRole(val: number, role: RoleItem) {
    emit('add-person-to-role', val, role);
}
function openDeleteDialog(person: PersonItem, role: RoleItem) {
    emit('open-delete-dialog', person, role);
}
function cancelRemovePersonFromRole() {
    emit('cancel-remove-person-from-role');
}
function confirmRemovePersonFromRole() {
    emit('confirm-remove-person-from-role');
}
function setPermission(role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'|'allowShow', value: boolean) {
    emit('set-permission', role, item, type, value);
}
// Use props.getAvailablePersonsForRole, props.getPersonsForRole, props.getStageTitle, props.getPermission directly in template
</script>
