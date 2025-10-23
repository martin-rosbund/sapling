<template>
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <!-- Rechteverwaltung zentral -->
            <v-col cols="12" md="9" class="d-flex flex-column">
                <v-card flat class="rounded-0" style="height:100%;">
                    <v-card-title class="bg-primary text-white">
                        <v-icon left>mdi-shield-account</v-icon> Rechteverwaltung
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-0" style="overflow:auto; height:100%;">
                        <div v-if="selectedPerson">
                            <v-table class="elevation-0" density="compact">
                                <thead>
                                    <tr>
                                        <th style="width:140px">Rolle</th>
                                        <th style="width:140px">Entität</th>
                                        <th style="width:60px">Create</th>
                                        <th style="width:60px">Read</th>
                                        <th style="width:60px">Update</th>
                                        <th style="width:60px">Delete</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="pair in roleEntityPairs" :key="pair.role.handle + '-' + pair.entity.handle">
                                        <td>
                                            <v-chip color="primary" class="ma-1" small>{{ pair.role.title }}</v-chip>
                                        </td>
                                        <td>
                                            <v-icon v-if="pair.entity.icon" left small>{{ pair.entity.icon }}</v-icon>
                                            {{ pair.entity.handle }}
                                        </td>
                                        <td class="text-center">
                                            <v-checkbox
                                                :model-value="getPermission(pair.role, pair.entity, 'allowInsert')"
                                                @update:model-value="val => setPermission(pair.role, pair.entity, 'allowInsert', !!val)"
                                                hide-details density="compact" :ripple="false"
                                            />
                                        </td>
                                        <td class="text-center">
                                            <v-checkbox
                                                :model-value="getPermission(pair.role, pair.entity, 'allowRead')"
                                                @update:model-value="val => setPermission(pair.role, pair.entity, 'allowRead', !!val)"
                                                hide-details density="compact" :ripple="false"
                                            />
                                        </td>
                                        <td class="text-center">
                                            <v-checkbox
                                                :model-value="getPermission(pair.role, pair.entity, 'allowUpdate')"
                                                @update:model-value="val => setPermission(pair.role, pair.entity, 'allowUpdate', !!val)"
                                                hide-details density="compact" :ripple="false"
                                            />
                                        </td>
                                        <td class="text-center">
                                            <v-checkbox
                                                :model-value="getPermission(pair.role, pair.entity, 'allowDelete')"
                                                @update:model-value="val => setPermission(pair.role, pair.entity, 'allowDelete', !!val)"
                                                hide-details density="compact" :ripple="false"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <!-- Personenauswahl rechts -->
            <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;">
                <v-card class="sideboard-card rounded-0" flat>
                    <v-card-title class="bg-primary text-white">
                        <v-icon left>mdi-account-group</v-icon> Personen
                    </v-card-title>
                    <v-divider></v-divider>
                    <PersonCompanyFilter
                    :people="persons"
                    :companies="[]"
                    :selectedPeople="selectedPerson ? [selectedPerson.handle] : []"
                    @togglePerson="handlePersonSelect"
                    />
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import { ref, computed } from 'vue';
import type { PersonItem, RoleItem, PermissionItem, EntityItem } from '../entity/entity';


import ApiGenericService from '../services/api.generic.service';
import { onMounted } from 'vue';

const persons = ref<PersonItem[]>([]);
const roles = ref<RoleItem[]>([]);
const entities = ref<EntityItem[]>([]);

onMounted(async () => {
    try {
        const resPersons = await ApiGenericService.find<PersonItem>('person');
        persons.value = resPersons.data;
    } catch (e) {
        console.error('Fehler beim Laden der Personen:', e);
    }
    try {
        const resRoles = await ApiGenericService.find<RoleItem>('role');
        roles.value = resRoles.data;
    } catch (e) {
        console.error('Fehler beim Laden der Rollen:', e);
    }
    try {
        const resEntities = await ApiGenericService.find<EntityItem>('entity');
        entities.value = resEntities.data;
    } catch (e) {
        console.error('Fehler beim Laden der Entities:', e);
    }
});

const selectedPerson = ref<PersonItem|null>(null);
function handlePersonSelect(personId: number) {
    const found = persons.value.find(p => p.handle === personId);
    if (found) selectedPerson.value = found;
    else selectedPerson.value = null;
}
const allEntities = computed(() => entities.value);
const allPermissions = ref<PermissionItem[]>([]); // Dummy bleibt leer, Logik ggf. anpassen

// Computed property für alle (role, entity)-Paare
const roleEntityPairs = computed(() => {
    if (!selectedPerson.value || !selectedPerson.value.roles) return [];
    const pairs = [];
    for (const role of selectedPerson.value.roles) {
        if (!role) continue;
        for (const entity of allEntities.value) {
            pairs.push({ role, entity });
        }
    }
    return pairs;
});

// Permission-Getter: Gibt true/false für die Checkboxen zurück
function getPermission(role: RoleItem, entity: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'): boolean {
    const perm = allPermissions.value.find(p =>
        p.entity.handle === entity.handle && (p.roles || []).some(r => r.handle === role.handle)
    );
    return !!(perm && perm[type]);
}

// Permission-Setter: Setzt Dummy-Wert in allPermissions (nur Demo, keine Persistenz)
function setPermission(role: RoleItem, entity: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete', value: boolean) {
    let perm = allPermissions.value.find(p =>
        p.entity.handle === entity.handle && (p.roles || []).some(r => r.handle === role.handle)
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
.sideboard {
  border-left: 1px solid #e0e0e0;
  margin-right: 0 !important;
  padding-right: 0 !important;
  right: 0;
}
.sideboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
