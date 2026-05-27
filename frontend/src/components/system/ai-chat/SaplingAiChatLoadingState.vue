<template>
  <div class="d-flex flex-column ga-4 pa-4 fill-height">
    <div class="d-flex align-center justify-space-between ga-4">
      <v-skeleton-loader type="heading, text" class="flex-grow-1" />
      <div class="d-flex ga-2">
        <v-skeleton-loader v-for="index in 3" :key="index" type="button" width="72" />
      </div>
    </div>

    <div class="d-flex flex-grow-1 ga-4">
      <v-skeleton-loader
        class="flex-grow-0"
        type="list-item-two-line@6"
        min-width="220"
        width="220"
      />
      <v-skeleton-loader class="flex-grow-1" type="article, article, article, article" />
    </div>
  </div>
</template>
