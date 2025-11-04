<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-permission
      :roles="roles"
      :entities="entities"
      :entity="entity"
      :open-panels="openPanels"
      :is-loading="isLoading"
      :add-person-select-models="addPersonSelectModels"
      :delete-dialog="deleteDialog"
      :get-available-persons-for-role="getAvailablePersonsForRole"
      :get-persons-for-role="getPersonsForRole"
      :get-stage-title="getStageTitle"
      :get-permission="getPermission"
      @add-person-to-role="addPersonToRole"
      @open-delete-dialog="openDeleteDialog"
      @cancel-remove-person-from-role="cancelRemovePersonFromRole"
      @confirm-remove-person-from-role="confirmRemovePersonFromRole"
      @set-permission="setPermission"
      @update:openPanels="val => openPanels = val"
    />
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingPermission from '@/components/SaplingPermission.vue';
import { useSaplingPermission } from '@/composables/useSaplingPermission';

export default defineComponent({
  name: 'RightView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingPermission
  },
  setup() {
    const {
      roles,
      entities,
      entity,
      openPanels,
      isLoading,
      addPersonSelectModels,
      deleteDialog,
      getAvailablePersonsForRole,
      addPersonToRole,
      openDeleteDialog,
      cancelRemovePersonFromRole,
      confirmRemovePersonFromRole,
      getStageTitle,
      getPersonsForRole,
      getPermission,
      setPermission,
    } = useSaplingPermission();
    return {
      roles,
      entities,
      entity,
      openPanels,
      isLoading,
      addPersonSelectModels,
      deleteDialog,
      getAvailablePersonsForRole,
      addPersonToRole,
      openDeleteDialog,
      cancelRemovePersonFromRole,
      confirmRemovePersonFromRole,
      getStageTitle,
      getPersonsForRole,
      getPermission,
      setPermission,
    };
  },
});
</script>