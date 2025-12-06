
<template>
  <v-container class="sapling-playground-preview pa-8" fluid>
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
          <v-card-title class="text-h6">Dropdown Selection</v-card-title>
          <v-card-text>
            <sapling-select-field
              label="Dropdown Field"
              entity-name="company"
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
    import SaplingBooleanField from '@/components/fields/SaplingBooleanField.vue';
    import SaplingColorField from '@/components/fields/SaplingColorField.vue';
    import SaplingShortTextField from '@/components/fields/SaplingShortTextField.vue';
    import SaplingLongTextField from '@/components/fields/SaplingLongTextField.vue';
    import SaplingNumberField from '@/components/fields/SaplingNumberField.vue';
    import SaplingDateTypeField from '@/components/fields/SaplingDateTypeField.vue';
    import SaplingTimeField from '@/components/fields/SaplingTimeField.vue';
    import SaplingDateTimeField from '@/components/fields/SaplingDateTimeField.vue';
    import SaplingPhoneField from '@/components/fields/SaplingPhoneField.vue';
    import SaplingMailField from '@/components/fields/SaplingMailField.vue';
    import SaplingLinkField from '@/components/fields/SaplingLinkField.vue';
    import SaplingIconField from '@/components/fields/SaplingIconField.vue';
    import SaplingSelectField from '@/components/fields/SaplingSelectField.vue';
    import { TILT_SOFT_OPTIONS } from '@/constants/tilt.constants';
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
    } = useSaplingPlayground();
    // #endregion
</script>