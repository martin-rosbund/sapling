import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTimelineDialogStore = defineStore('timelineDialog', () => {
  const dialog = ref(false)
  const entityHandle = ref('')
  const recordHandle = ref('')

  function openTimeline(nextEntityHandle: string, nextRecordHandle: string | number) {
    if (!nextEntityHandle || nextRecordHandle == null || nextRecordHandle === '') {
      return
    }

    entityHandle.value = nextEntityHandle
    recordHandle.value = String(nextRecordHandle)
    dialog.value = true
  }

  function closeTimeline() {
    dialog.value = false
  }

  return {
    dialog,
    entityHandle,
    recordHandle,
    openTimeline,
    closeTimeline,
  }
})