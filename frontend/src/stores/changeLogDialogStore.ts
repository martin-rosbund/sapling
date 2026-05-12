import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChangeLogDialogStore = defineStore('changeLogDialog', () => {
  const dialog = ref(false)
  const entityHandle = ref('')
  const recordHandle = ref('')

  function openChangeLog(nextEntityHandle: string, nextRecordHandle: string | number) {
    if (!nextEntityHandle || nextRecordHandle == null || nextRecordHandle === '') {
      return
    }

    entityHandle.value = nextEntityHandle
    recordHandle.value = String(nextRecordHandle)
    dialog.value = true
  }

  function closeChangeLog() {
    dialog.value = false
  }

  return {
    dialog,
    entityHandle,
    recordHandle,
    openChangeLog,
    closeChangeLog,
  }
})
