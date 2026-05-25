<template>
  <span class="sapling-shortcut-keys" :class="`sapling-shortcut-keys--${size}`">
    <kbd v-for="key in keys" :key="key">{{ key }}</kbd>
  </span>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    keys: string[]
    size?: 'sm' | 'md'
  }>(),
  {
    size: 'md',
  },
)
</script>
