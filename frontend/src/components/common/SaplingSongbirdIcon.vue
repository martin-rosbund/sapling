<template>
  <img class="sapling-songbird-icon" :src="songbirdIconUrl" alt="" aria-hidden="true" />
</template>

<script lang="ts" setup>
import songbirdIconUrl from '@/assets/songbird-icon.png'
</script>

<style scoped>
.sapling-songbird-icon {
  display: block;
  width: 1em;
  height: 1em;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}
</style>
