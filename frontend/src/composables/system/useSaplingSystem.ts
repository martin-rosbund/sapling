import { ref, onMounted, onUnmounted } from 'vue';
import ApiService from '@/services/api.service';

export function useSaplingSystem() {

  // State
  const cpu = ref<any>(null);
  const cpuLoading = ref(true);
  const cpuError = ref<string | null>(null);

  const cpuSpeed = ref<any>(null);
  const cpuSpeedLoading = ref(true);
  const cpuSpeedError = ref<string | null>(null);

  const memory = ref<any>(null);
  const memoryLoading = ref(true);
  const memoryError = ref<string | null>(null);

  const filesystem = ref<any[]>([]);
  const filesystemLoading = ref(true);
  const filesystemError = ref<string | null>(null);

  const os = ref<any>(null);
  const osLoading = ref(true);
  const osError = ref<string | null>(null);

  const state = ref<{ isReady: boolean } | null>(null);
  const stateLoading = ref(true);
  const stateError = ref<string | null>(null);

  const network = ref<any[]>([]);
  const networkLoading = ref(true);
  const networkError = ref<string | null>(null);

  // Polling Interval
  let interval: any = null;
  const POLL_INTERVAL = 5000; // ms

  // Fetch Functions
  async function fetchCpu() {
    cpuLoading.value = true;
    cpuError.value = null;
    try {
      cpu.value = await ApiService.findOne('system/cpu');
    } catch (e: any) {
      cpuError.value = e.message || 'Fehler beim Laden der CPU-Daten';
    } finally {
      cpuLoading.value = false;
    }
  }
  async function fetchCpuSpeed() {
    cpuSpeedLoading.value = true;
    cpuSpeedError.value = null;
    try {
      cpuSpeed.value = await ApiService.findOne('system/cpu/speed');
    } catch (e: any) {
      cpuSpeedError.value = e.message || 'Fehler beim Laden der CPU-Auslastung';
    } finally {
      cpuSpeedLoading.value = false;
    }
  }
  async function fetchMemory() {
    memoryLoading.value = true;
    memoryError.value = null;
    try {
      memory.value = await ApiService.findOne('system/memory');
    } catch (e: any) {
      memoryError.value = e.message || 'Fehler beim Laden des Arbeitsspeichers';
    } finally {
      memoryLoading.value = false;
    }
  }
  async function fetchFilesystem() {
    filesystemLoading.value = true;
    filesystemError.value = null;
    try {
      filesystem.value = await ApiService.findOne('system/filesystem');
    } catch (e: any) {
      filesystemError.value = e.message || 'Fehler beim Laden der Festplatten';
    } finally {
      filesystemLoading.value = false;
    }
  }
  async function fetchOs() {
    osLoading.value = true;
    osError.value = null;
    try {
      os.value = await ApiService.findOne('system/os');
    } catch (e: any) {
      osError.value = e.message || 'Fehler beim Laden des Betriebssystems';
    } finally {
      osLoading.value = false;
    }
  }

  async function fetchNetwork() {
    networkLoading.value = true;
    networkError.value = null;
    try {
      network.value = await ApiService.findOne('system/network');
    } catch (e: any) {
      networkError.value = e.message || 'Fehler beim Laden der Netzwerkdaten';
    } finally {
      networkLoading.value = false;
    }
  }

  async function fetchState() {
    stateLoading.value = true;
    stateError.value = null;
    try {
      state.value = await ApiService.findOne('system/state');
    } catch (e: any) {
      stateError.value = e.message || 'Fehler beim Laden des Systemstatus';
    } finally {
      stateLoading.value = false;
    }
  }

  // Polling Setup
  async function fetchAll() {
    await Promise.all([
      fetchCpu(),
      fetchCpuSpeed(),
      fetchMemory(),
      fetchFilesystem(),
      fetchOs(),
      fetchState(),
      fetchNetwork(),
    ]);
  }

  async function fetchNonPersistent() {
    await Promise.all([
      fetchCpuSpeed()
    ]);
  }

  onMounted(() => {
    fetchAll();
    interval = setInterval(fetchNonPersistent, POLL_INTERVAL);
  });
  onUnmounted(() => {
    if (interval) clearInterval(interval);
  });

  // Return
  return {
    cpu, cpuLoading, cpuError,
    cpuSpeed, cpuSpeedLoading, cpuSpeedError,
    memory, memoryLoading, memoryError,
    filesystem, filesystemLoading, filesystemError,
    os, osLoading, osError,
    state, stateLoading, stateError,
    network, networkLoading, networkError,
    fetchAll
  };
  
}