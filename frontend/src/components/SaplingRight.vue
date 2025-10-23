
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
                        <div class="mb-4 d-flex align-center">
                            <v-avatar size="40" class="mr-2" color="primary">
                                <span class="white--text text-h6">{{ selectedPerson.firstName.charAt(0) }}{{ selectedPerson.lastName.charAt(0) }}</span>
                            </v-avatar>
                            <span class="text-h6">{{ selectedPerson.firstName }} {{ selectedPerson.lastName }}</span>
                            <span class="ml-2 text-caption text-grey">({{ selectedPerson.email }})</span>
                        </div>
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
                <v-list dense>
                    <v-list-subheader>Personen</v-list-subheader>
                                        <div>
                                            <div
                                                v-for="person in people"
                                                :key="'person-' + person.handle"
                                                class="vertical-item"
                                                :class="{ 'selected': selectedPerson && selectedPerson.handle === person.handle }"
                                                @click="selectPerson(person)"
                                                style="display:flex; align-items:center;"
                                            >
                                                <v-avatar size="24" class="mr-1" color="primary">
                                                    <span class="white--text">{{ person.firstName.charAt(0) }}{{ person.lastName.charAt(0) }}</span>
                                                </v-avatar>
                                                <span style="flex:1">{{ person.firstName }} {{ person.lastName }}</span>
                                                <v-checkbox
                                                    :model-value="selectedPerson && selectedPerson.handle === person.handle"
                                                    hide-details
                                                    density="compact"
                                                    class="ml-1"
                                                    @click.stop="selectPerson(person)"
                                                    :ripple="false"
                                                    style="pointer-events: none;"
                                                />
                                            </div>
                                        </div>
                
                </v-list>
            </v-card>
        </v-col>
    </v-row>
</v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PersonItem, RoleItem, PermissionItem, EntityItem } from '../entity/entity';

// Dummy-Daten für Personen (später per API laden)
// Testdaten als Arrays (keine .value auf Arrays!)
const testRoles: RoleItem[] = [
    { handle: 1, title: 'Admin', createdAt: null, updatedAt: null },
    { handle: 2, title: 'Support', createdAt: null, updatedAt: null },
    { handle: 3, title: 'User', createdAt: null, updatedAt: null },
];
const testEntities: EntityItem[] = [
    { handle: 'ticket', icon: 'mdi-ticket', isMenu: true, createdAt: null },
    { handle: 'note', icon: 'mdi-note', isMenu: true, createdAt: null },
    { handle: 'company', icon: 'mdi-domain', isMenu: true, createdAt: null },
    { handle: 'person', icon: 'mdi-account', isMenu: true, createdAt: null },
    { handle: 'contract', icon: 'mdi-file-document', isMenu: true, createdAt: null },
];
const people = ref<PersonItem[]>([
    {
        handle: 1,
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        isActive: true,
        requirePasswordChange: false,
        createdAt: null,
        roles: [testRoles[0] as RoleItem, testRoles[2] as RoleItem], // Admin, User
    },
    {
        handle: 2,
        firstName: 'Erika',
        lastName: 'Musterfrau',
        email: 'erika@example.com',
        isActive: true,
        requirePasswordChange: false,
        createdAt: null,
        roles: [testRoles[1] as RoleItem], // Support
    },
]);
const selectedPerson = ref<PersonItem|null>(null);
function selectPerson(person: PersonItem) {
    selectedPerson.value = person;
}
const allEntities = testEntities;
const allPermissions = ref<PermissionItem[]>([
    {
        allowRead: true,
        allowInsert: true,
        allowUpdate: true,
        allowDelete: false,
        allowShow: true,
        entity: testEntities[0] as EntityItem, // ticket
        roles: [testRoles[0] as RoleItem, testRoles[1] as RoleItem], // Admin, Support
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: false,
        allowUpdate: false,
        allowDelete: false,
        allowShow: true,
        entity: testEntities[1] as EntityItem, // note
        roles: [testRoles[2] as RoleItem], // User
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: true,
        allowUpdate: false,
        allowDelete: false,
        allowShow: true,
        entity: testEntities[2] as EntityItem, // company
        roles: [testRoles[0] as RoleItem], // Admin
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: false,
        allowUpdate: false,
        allowDelete: false,
        allowShow: true,
        entity: testEntities[3] as EntityItem, // person
        roles: [testRoles[1] as RoleItem, testRoles[2] as RoleItem], // Support, User
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: true,
        allowUpdate: true,
        allowDelete: true,
        allowShow: true,
        entity: testEntities[4] as EntityItem, // contract
        roles: [testRoles[0] as RoleItem], // Admin
        createdAt: null,
    },
]);

// Computed property für alle (role, entity)-Paare
const roleEntityPairs = computed(() => {
    if (!selectedPerson.value || !selectedPerson.value.roles) return [];
    const pairs = [];
    for (const role of selectedPerson.value.roles) {
        for (const entity of allEntities) {
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
.favorite-item {
  cursor: pointer;
}
.v-list-item--active {
  background: #e0e0e01a !important;
}
.vertical-item {
  display: flex;
  align-items: center;
  border-radius: 18px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 8px;
}
.vertical-item.selected {
  background: #e0e0e01a;
  border: 1px solid #1976d2;
}
</style>
