
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
                    <v-card-text class="pa-0" style="overflow:auto;">
                        <div v-if="selectedPerson">
                            <div class="mb-4">
                                <v-avatar size="40" class="mr-2" color="primary">
                                    <span class="white--text text-h6">{{ selectedPerson.firstName.charAt(0) }}{{ selectedPerson.lastName.charAt(0) }}</span>
                                </v-avatar>
                                <span class="text-h6">{{ selectedPerson.firstName }} {{ selectedPerson.lastName }}</span>
                                <span class="ml-2 text-caption text-grey">({{ selectedPerson.email }})</span>
                            </div>
                            <v-table class="elevation-0" density="compact">
                                <thead>
                                    <tr>
                                        <th style="width:180px">Rolle</th>
                                        <th style="width:350px">Entitäten</th>
                                        <th style="width:80px">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="role in selectedPerson.roles || []" :key="role.handle">
                                        <td>
                                            <v-chip color="primary" class="ma-1" small>{{ role.title }}</v-chip>
                                        </td>
                                        <td>
                                            <v-chip
                                                v-for="entity in getEntitiesForRole(role)"
                                                :key="entity.handle"
                                                class="ma-1"
                                                color="secondary"
                                                small
                                            >
                                                <v-icon v-if="entity.icon" left small>{{ entity.icon }}</v-icon>
                                                {{ entity.handle }}
                                            </v-chip>
                                        </td>
                                        <td>
                                            <v-btn icon size="small" @click="addEntityToRole(role)">
                                                <v-icon>mdi-plus</v-icon>
                                            </v-btn>
                                        </td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>
                        <div v-else class="text-grey text-center pa-10">
                            <v-icon size="40">mdi-account-question</v-icon>
                            <div>Bitte eine Person auswählen</div>
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
                        <div>
                            <div
                                v-for="person in people"
                                :key="'person-' + person.handle"
                                class="vertical-item"
                                :class="{ 'selected': selectedPerson && selectedPerson.handle === person.handle }"
                                @click="selectPerson(person)"
                                style="align-items: center;"
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
const testRoles: RoleItem[] = [
    { handle: 1, title: 'Admin', createdAt: null, updatedAt: null },
    { handle: 2, title: 'Support', createdAt: null, updatedAt: null },
    { handle: 3, title: 'User', createdAt: null, updatedAt: null },
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
        roles: [testRoles[0], testRoles[2]], // Admin, User
    },
    {
        handle: 2,
        firstName: 'Erika',
        lastName: 'Musterfrau',
        email: 'erika@example.com',
        isActive: true,
        requirePasswordChange: false,
        createdAt: null,
        roles: [testRoles[1]], // Support
    },
]);

const selectedPerson = ref<PersonItem|null>(null);

function selectPerson(person: PersonItem) {
    selectedPerson.value = person;
}

const allEntities = ref<EntityItem[]>([
    { handle: 'ticket', icon: 'mdi-ticket', isMenu: true, createdAt: null },
    { handle: 'note', icon: 'mdi-note', isMenu: true, createdAt: null },
    { handle: 'company', icon: 'mdi-domain', isMenu: true, createdAt: null },
    { handle: 'person', icon: 'mdi-account', isMenu: true, createdAt: null },
    { handle: 'contract', icon: 'mdi-file-document', isMenu: true, createdAt: null },
]);

const allPermissions = ref<PermissionItem[]>([
    {
        allowRead: true,
        allowInsert: true,
        allowUpdate: true,
        allowDelete: false,
        allowShow: true,
        entity: allEntities.value[0], // ticket
        roles: [testRoles[0], testRoles[1]], // Admin, Support
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: false,
        allowUpdate: false,
        allowDelete: false,
        allowShow: true,
        entity: allEntities.value[1], // note
        roles: [testRoles[2]], // User
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: true,
        allowUpdate: false,
        allowDelete: false,
        allowShow: true,
        entity: allEntities.value[2], // company
        roles: [testRoles[0]], // Admin
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: false,
        allowUpdate: false,
        allowDelete: false,
        allowShow: true,
        entity: allEntities.value[3], // person
        roles: [testRoles[1], testRoles[2]], // Support, User
        createdAt: null,
    },
    {
        allowRead: true,
        allowInsert: true,
        allowUpdate: true,
        allowDelete: true,
        allowShow: true,
        entity: allEntities.value[4], // contract
        roles: [testRoles[0]], // Admin
        createdAt: null,
    },
]);




// Hilfsfunktion: Gibt alle Entitäten zurück, die für eine Rolle in den Permissions stehen
function getEntitiesForRole(role: RoleItem): EntityItem[] {
    return allPermissions.value
        .filter(p => (p.roles || []).some(r => r.handle === role.handle))
        .map(p => p.entity);
}

function addEntityToRole(role: RoleItem) {
    // Öffne Dialog oder Sheet zur Auswahl einer Entität (später)
    alert('Entität zu Rolle hinzufügen: ' + role.title);
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
