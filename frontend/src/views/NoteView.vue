<template>
  <SaplingNote />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

// Components

// Composables
import SaplingNote from '@/components/note/SaplingNote.vue'

export default defineComponent({
  name: 'NoteView',
  components: {
    SaplingNote,
  },
})
</script>
