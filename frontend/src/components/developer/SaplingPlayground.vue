<template>
  <v-container class="sapling-scrollable" fluid>
    <v-row>
      <v-col cols="12" md="6">
        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Text Fields</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-short-text-field
                  label="Short Text Field"
                  :model-value="shortTextFieldValue"
                  :disabled="false"
                  @update:model-value="setShortTextFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-long-text-field
                  label="Long Text Field"
                  :model-value="longTextFieldValue"
                  :disabled="false"
                  @update:model-value="setLongTextFieldValue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Markdown Field</v-card-title>
          <v-card-text>
            <sapling-markdown-field
              label="Markdown Feld"
              :model-value="markdownFieldValue"
              :rows="8"
              :show-preview="true"
              @update:model-value="setMarkdownFieldValue"
            />
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Contact Fields</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="4">
                <sapling-phone-field
                  label="Phone Field"
                  :model-value="phoneFieldValue"
                  :disabled="false"
                  @update:model-value="setPhoneFieldValue"
                  placeholder="Enter phone number"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <sapling-mail-field
                  label="Mail Field"
                  :model-value="mailFieldValue"
                  :disabled="false"
                  @update:model-value="setMailFieldValue"
                  placeholder="Enter email address"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <sapling-link-field
                  label="Link Field"
                  :model-value="linkFieldValue"
                  :disabled="false"
                  @update:model-value="setLinkFieldValue"
                  placeholder="Enter URL"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Other Fields</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-boolean-field 
                  label="Boolean Field"
                  :model-value="booleanFieldValue"
                  :disabled="false"
                  @update:model-value="setBooleanFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-color-field
                  label="Color Field"
                  :model-value="colorFieldValue"
                  :disabled="false"
                  @update:model-value="setColorFieldValue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Numbers & Dates</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-number-field
                  label="Number Field"
                  :model-value="numberFieldValue"
                  :disabled="false"
                  @update:model-value="setNumberFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-date-type-field
                  label="Date Field"
                  :model-value="dateTypeFieldValue"
                  :disabled="false"
                  @update:model-value="setDateTypeFieldValue"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-time-field
                  label="Time Field"
                  :model-value="timeFieldValue"
                  :disabled="false"
                  @update:model-value="setTimeFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-date-time-field
                  label="DateTime Field"
                  :date-value="dateTimeDateValue"
                  :time-value="dateTimeTimeValue"
                  :disabled="false"
                  @update:date-value="setDateTimeDateValue"
                  @update:time-value="setDateTimeTimeValue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Icon Selection</v-card-title>
          <v-card-text>
            <sapling-icon-field
              label="Icon Field"
              :items="iconFieldItems"
              :model-value="iconFieldValue"
              :disabled="false"
              @update:model-value="setIconFieldValue"
            />
          </v-card-text>
        </v-card>

        <v-card elevation="1" class="mb-6 glass-panel" v-tilt="TILT_SOFT_OPTIONS">
          <v-card-title class="text-h6">Select Field</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-select-field
                  label="Multi Select Field"
                  entity-name="company"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-single-select-field
                  label="Single Select Field"
                  entity-name="company"
                />
              </v-col>
              <v-col cols="12" sm="12">
                <SaplingSingleSelectAddField
                  :label="'Single Select Transfer Field'"
                  :entityName="'company'"
                />
              </v-col>
              <v-col cols="12" sm="12">
                <SaplingSelectAddField
                  :label="'Multi Select Transfer Field'"
                  :entityName="'company'"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" >
        <v-skeleton-loader
          v-if="kpiItemLoadling"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"/>
        <SaplingKpiCard v-else
          :kpi="kpiItem"
          :kpiIdx="1"
        />
      </v-col>
      <v-col cols="12" md="6" >
        <v-skeleton-loader
          v-if="kpiListLoadling"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"/>
        <SaplingKpiCard v-else
          :kpi="kpiList"
          :kpiIdx="3"
        />
      </v-col>
      <v-col cols="12" md="6" >
        <v-skeleton-loader
          v-if="kpiTrendLoadling"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"/>
        <SaplingKpiCard v-else
          :kpi="kpiTrend"
          :kpiIdx="7"
        />
      </v-col>
      <v-col cols="12" md="6" >
        <v-skeleton-loader
          v-if="kpiSparklineLoadling"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"/>
        <SaplingKpiCard v-else
          :kpi="kpiSparkline"
          :kpiIdx="9"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="12" >
        <v-card elevation="1" class="mb-6 glass-panel">
          <v-card-title class="text-h6">Search and Table</v-card-title>
          <v-card-text>
           <sapling-table
            entity-name="company"
            :items="items"
            :search="search"
            :page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalItems"
            :is-loading="isLoading"
            :sort-by="sortBy"
            :entity-templates="entityTemplates"
            :entity="entity"
            :entity-permission="entityPermission"
            :show-actions="true"
            :multi-select="false"
            table-key="company"
            @update:page="onPageUpdate"
            @update:items-per-page="onItemsPerPageUpdate"
            @update:sort-by="onSortByUpdate"
            @update:search="onSearchUpdate"
            @reload="loadData"
          />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
    // #region Imports
    import { useSaplingPlayground } from '@/composables/developer/useSaplingPlayground';
    import SaplingBooleanField from '@/components/dialog/fields/SaplingFieldBoolean.vue';
    import SaplingColorField from '@/components/dialog/fields/SaplingFieldColor.vue';
    import SaplingShortTextField from '@/components/dialog/fields/SaplingFieldShortText.vue';
    import SaplingLongTextField from '@/components/dialog/fields/SaplingFieldLongText.vue';
    import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue';
    import SaplingDateTypeField from '@/components/dialog/fields/SaplingFieldDateType.vue';
    import SaplingTimeField from '@/components/dialog/fields/SaplingFieldTime.vue';
    import SaplingDateTimeField from '@/components/dialog/fields/SaplingFieldDateTime.vue';
    import SaplingPhoneField from '@/components/dialog/fields/SaplingFieldPhone.vue';
    import SaplingMailField from '@/components/dialog/fields/SaplingFieldMail.vue';
    import SaplingLinkField from '@/components/dialog/fields/SaplingFieldLink.vue';
    import SaplingIconField from '@/components/dialog/fields/SaplingFieldIcon.vue';
    import SaplingSelectField from '@/components/dialog/fields/SaplingFieldSelect.vue';
    import SaplingSelectAddField from '@/components/dialog/fields/SaplingFieldSelectAdd.vue';
    import SaplingSingleSelectField from '@/components/dialog/fields/SaplingFieldSingleSelect.vue';
    import SaplingSingleSelectAddField from '@/components/dialog/fields/SaplingFieldSingleSelectAdd.vue';
    import SaplingTable from '@/components/table/SaplingTable.vue';
    import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue';
    import { TILT_SOFT_OPTIONS } from '@/constants/tilt.constants';
    import { useSaplingTable } from '@/composables/table/useSaplingTable';
    import { ref } from 'vue';
    import SaplingKpiCard from '../kpi/SaplingKpiCard.vue';
    // #endregion

    // #region Composable
    const {
      booleanFieldValue,
      setBooleanFieldValue,
      colorFieldValue,
      setColorFieldValue,
      shortTextFieldValue,
      setShortTextFieldValue,
      longTextFieldValue,
      setLongTextFieldValue,
      numberFieldValue,
      setNumberFieldValue,
      dateTypeFieldValue,
      setDateTypeFieldValue,
      timeFieldValue,
      setTimeFieldValue,
      dateTimeDateValue,
      setDateTimeDateValue,
      dateTimeTimeValue,
      setDateTimeTimeValue,
      phoneFieldValue,
      setPhoneFieldValue,
      mailFieldValue,
      setMailFieldValue,
      linkFieldValue,
      setLinkFieldValue,
      iconFieldItems,
      iconFieldValue,
      setIconFieldValue,
      kpiItem,
      kpiList,
      kpiTrend,
      kpiSparkline,
      kpiItemLoadling,
      kpiListLoadling,
      kpiTrendLoadling,
      kpiSparklineLoadling,
      markdownFieldValue,
      setMarkdownFieldValue,
    } = useSaplingPlayground();

    const {
      items,
      search,
      page,
      itemsPerPage,
      totalItems,
      isLoading,
      sortBy,
      entityTemplates,
      entity,
      entityPermission,
      loadData,
      onSearchUpdate,
      onPageUpdate,
      onItemsPerPageUpdate,
      onSortByUpdate,
    } = useSaplingTable(ref('company'));
    // #endregion
</script>