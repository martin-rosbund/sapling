import { ref } from 'vue';

export interface Message {
  id: number;
  type: 'error' | 'info' | 'success' | 'warning';
  message: string;
  description: string;
  entity: string;
  timestamp: Date;
  hidden?: boolean;
}

const messages = ref<Message[]>([]);
let nextId = 1;

export function useMessageCenter() {
  function pushMessage(type: Message['type'], message: string, description: string, entity: string) {
    const meldung: Message = {
      id: nextId++,
      type,
      message,
      description,
      entity,
      timestamp: new Date(),
      hidden: false,
    };
    messages.value.unshift(meldung);
    setTimeout(() => hideMessage(meldung.id), 5000);
  }

  function hideMessage(id: number) {
    const msg = messages.value.find(m => m.id === id);
    if (msg) msg.hidden = true;
  }

  function removeMessage(id: number) {
    messages.value = messages.value.filter(m => m.id !== id);
  }

  function clearAll() {
    messages.value = [];
  }

  return {
    messages,
    pushMessage,
    removeMessage,
    clearAll,
  };
}
