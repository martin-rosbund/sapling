<template>
  <!--
    Skeleton placeholder shaped like a SaplingActionBar. Used in dialog loading
    states so the action bar maintains its layout while translations / data load.
  -->
  <div class="sapling-dialog__footer sapling-action-bar">
    <v-card-actions class="sapling-dialog__actions sapling-action-bar__content">
      <div class="sapling-action-bar__group sapling-action-bar__group--leading">
        <v-skeleton-loader
          v-for="(width, index) in leadingWidths"
          :key="`leading-${index}`"
          type="button"
          :width="width"
        />
      </div>
      <div class="sapling-action-bar__spacer"></div>
      <div class="sapling-action-bar__group sapling-action-bar__group--trailing">
        <v-skeleton-loader
          v-for="(width, index) in trailingWidths"
          :key="`trailing-${index}`"
          type="button"
          :width="width"
        />
      </div>
    </v-card-actions>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

// #region Props
const props = withDefaults(
  defineProps<{
    leading?: number | (number | string)[]
    trailing?: number | (number | string)[]
    buttonWidth?: number | string
  }>(),
  {
    leading: 1,
    trailing: 1,
    buttonWidth: 112,
  },
)
// #endregion

// #region Computed
function normalize(value: number | (number | string)[]): (number | string)[] {
  if (Array.isArray(value)) {
    return value
  }
  return Array.from({ length: Math.max(0, value) }, () => props.buttonWidth)
}

const leadingWidths = computed(() => normalize(props.leading))
const trailingWidths = computed(() => normalize(props.trailing))
// #endregion
</script>
