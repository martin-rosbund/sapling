<template>
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <!-- Neue rollenbasierte Rechteverwaltung -->
            <v-col cols="12" class="d-flex flex-column">
                <v-card flat class="rounded-0">
                    <v-card-title class="bg-primary text-white">
                        <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.${entity?.handle}`) }}
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-0">
                        <v-expansion-panels v-model="openPanels" multiple>
                            <v-expansion-panel
                                v-for="role in roles"
                                :key="role.handle ?? role.title"
                            >
                                <v-expansion-panel-title>
                                    <div class="role-header-row">
                                        <div class="role-header-label">{{ $t(`navigation.role`) }}</div>
                                        <div class="role-header-value"><v-chip color="primary" class="ma-1" small>{{ role.title }}</v-chip></div>
                                        <div class="role-header-label">{{ $t(`role.stage`) }}</div>
                                        <div class="role-header-value"><v-chip class="ma-1" small>{{ getStageTitle(role.stage) }}</v-chip></div>
                                        <div class="role-header-label">{{ $t(`role.persons`) }}</div>
                                        <div class="role-header-value">
                                            <div class="role-person-chips">
                                                <v-chip
                                                    v-for="person in getPersonsForRole(role)"
                                                    :key="'person-'+person.handle"
                                                    color="secondary"
                                                    small
                                                >
                                                    {{ person.firstName }} {{ person.lastName }}
                                                </v-chip>
                                            </div>
                                        </div>
                                    </div>
                                </v-expansion-panel-title>
                                <v-expansion-panel-text>
                                    <v-table class="elevation-0" density="compact">
                                        <thead>
                                            <tr>
                                                <th style="width:140px">{{ $t(`navigation.entity`) }}</th>
                                                <th style="width:60px">{{ $t(`permission.allowInsert`) }}</th>
                                                <th style="width:60px">{{ $t(`permission.allowRead`) }}</th>
                                                <th style="width:60px">{{ $t(`permission.allowUpdate`) }}</th>
                                                <th style="width:60px">{{ $t(`permission.allowDelete`) }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="entity in entities" :key="entity.handle">
                                                <td>
                                                    <v-icon v-if="entity.icon" left small>{{ entity.icon }}</v-icon>
                                                    {{ $t(`navigation.${entity.handle}`) }}
                                                </td>
                                                <td class="text-center">
                                                    <v-checkbox
                                                        v-if="entity.canInsert"
                                                        :model-value="getPermission(role, entity, 'allowInsert')"
                                                        @update:model-value="val => setPermission(role, entity, 'allowInsert', !!val)"
                                                        hide-details density="compact" :ripple="false"
                                                    />
                                                </td>
                                                <td class="text-center">
                                                    <v-checkbox
                                                        :model-value="getPermission(role, entity, 'allowRead')"
                                                        @update:model-value="val => setPermission(role, entity, 'allowRead', !!val)"
                                                        hide-details density="compact" :ripple="false"
                                                    />
                                                </td>
                                                <td class="text-center">
                                                    <v-checkbox
                                                        v-if="entity.canUpdate"
                                                        :model-value="getPermission(role, entity, 'allowUpdate')"
                                                        @update:model-value="val => setPermission(role, entity, 'allowUpdate', !!val)"
                                                        hide-details density="compact" :ripple="false"
                                                    />
                                                </td>
                                                <td class="text-center">
                                                    <v-checkbox
                                                        v-if="entity.canDelete"
                                                        :model-value="getPermission(role, entity, 'allowDelete')"
                                                        @update:model-value="val => setPermission(role, entity, 'allowDelete', !!val)"
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
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import './SaplingRight.css';
import { ref, onMounted } from 'vue';
import type { PersonItem, RoleItem, PermissionItem, EntityItem } from '../entity/entity';
import ApiGenericService from '../services/api.generic.service';
import TranslationService from '@/services/translation.service';

const persons = ref<PersonItem[]>([]);
const roles = ref<RoleItem[]>([]);
const entities = ref<EntityItem[]>([]);
const entity = ref<EntityItem | null>(null);
const allPermissions = ref<PermissionItem[]>([]); // Dummy bleibt leer, Logik ggf. anpassen

// Das erste Accordion-Panel standardmäßig öffnen
const openPanels = ref<number[]>([0]);

onMounted(async () => {
    loadEntity();

    const translationService = new TranslationService();
    await translationService.prepare('global', 'entity', 'role', 'person', 'permission');

    roles.value = (await ApiGenericService.find<RoleItem>('role')).data;
    entities.value = (await ApiGenericService.find<EntityItem>('entity')).data;
    persons.value = (await ApiGenericService.find<PersonItem>('person')).data;
});

// Hilfsfunktion für Stage-Titel
const getStageTitle = (stage: any): string => {
    if (!stage) return 'global';
    if (typeof stage === 'string') return stage;
    if (typeof stage === 'object' && 'title' in stage) return stage.title;
    return 'global';
};

function getPersonsForRole(role: RoleItem): PersonItem[] {
    // Annahme: PersonItem hat roles: RoleItem[]
    return persons.value.filter(p => (p.roles || []).some(r => r.handle === role.handle));
}

function getPermission(role: RoleItem, entity: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'): boolean {
    if (!role.permissions) return false;
    const perm = role.permissions.find(p => p.entity && p.entity === entity.handle);
    return perm ? perm[type] === true : false;
}

/**
 * Loads the entity definition.
 */
async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { handle: 'right' }, {}, 1, 1)).data[0] || null;
};

function setPermission(role: RoleItem, entity: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete', value: boolean) {
    let perm = allPermissions.value.find(p =>
        p.entity === entity.handle && (p.roles || []).some(r => r.handle === role.handle)
    );
    if (!perm) {
        perm = {
            allowRead: false,
            allowInsert: false,
            allowUpdate: false,
            allowDelete: false,
            allowShow: false,
            entity,
            roles: [role],
            createdAt: null,
        };
        allPermissions.value.push(perm);
    }
    perm[type] = value;
}
</script>

<style scoped>
.role-header-row {
    display: grid;
    grid-template-columns: 70px 1fr 70px 1fr 80px 3fr;
    align-items: center;
    gap: 0 4px;
    width: 100%;
}
.role-header-label {
    font-weight: 500;
    color: #555;
    white-space: nowrap;
    text-align: right;
    padding-right: 4px;
}
.role-header-value {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    min-width: 0;
}
.role-person-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}
</style>
