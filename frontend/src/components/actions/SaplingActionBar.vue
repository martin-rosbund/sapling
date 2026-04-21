<template>
  <div class="sapling-dialog__footer sapling-action-bar">
    <v-card-actions class="sapling-dialog__actions sapling-action-bar__content">
      <div
        v-if="$slots.leading"
        class="sapling-action-bar__group sapling-action-bar__group--leading"
      >
        <slot name="leading" />
      </div>

      <div class="sapling-action-bar__spacer"></div>

      <div
        v-if="$slots.trailing"
        class="sapling-action-bar__group sapling-action-bar__group--trailing"
      >
        <slot name="trailing" />
      </div>
    </v-card-actions>
  </div>
</template>
