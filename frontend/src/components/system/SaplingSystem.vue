
<template>
  <v-container class="sapling-system-page pa-1" fluid>
    <template v-if="isLoading">
      <div class="sapling-system-skeleton">
        <v-skeleton-loader class="glass-panel" type="article" />
        <div class="sapling-system-skeleton__metrics">
          <v-skeleton-loader v-for="item in 4" :key="item" class="glass-panel" type="article" />
        </div>
        <div class="sapling-system-skeleton__sections">
          <v-skeleton-loader class="glass-panel" type="article" />
          <v-skeleton-loader class="glass-panel" type="article" />
        </div>
      </div>
    </template>

    <template v-else>
      <SaplingPageHero
        class="sapling-system-hero"
        variant="system"
        :eyebrow="$t('system.system')"
        :title="systemTitle"
        :subtitle="systemSubtitle"
      >
        <template #meta>
          <v-chip size="small" color="primary" variant="tonal">
            {{ displayValue(os?.platform) }}
          </v-chip>
          <v-chip size="small" variant="outlined">
            {{ displayValue(os?.arch) }}
          </v-chip>
          <v-chip v-if="version?.version" size="small" variant="outlined">
            v{{ version.version }}
          </v-chip>
        </template>

        <template #side>
          <div class="sapling-system-hero__side">
            <article class="sapling-system-hero-card">
              <div class="sapling-system-hero-card__header">
                <span>{{ $t('system.health') }}</span>
                <v-chip
                  :color="state?.isReady ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ state?.isReady ? $t('system.isReady') : $t('system.isNotReady') }}
                </v-chip>
              </div>
              <strong>{{ state?.isReady ? $t('system.operational') : $t('system.requiresAttention') }}</strong>
              <p>{{ $t('system.liveFeedHint') }}</p>
            </article>

            <article class="sapling-system-hero-card">
              <div class="sapling-system-hero-card__header">
                <span>{{ $t('system.runtime') }}</span>
                <v-btn
                  icon="mdi-refresh"
                  size="small"
                  variant="text"
                  :loading="refreshing"
                  :title="$t('system.refresh')"
                  @click="refreshDashboard"
                />
              </div>
              <strong>{{ timeLoading ? '...' : formattedServerTime }}</strong>
              <p>{{ $t('system.lastRefresh') }}: {{ lastUpdatedDisplay }}</p>
            </article>
          </div>
        </template>
      </SaplingPageHero>

      <v-alert
        v-if="stateError"
        type="error"
        density="comfortable"
        variant="tonal"
        class="sapling-system-banner"
      >
        {{ stateError }}
      </v-alert>

      <section class="sapling-system-metrics">
        <SaplingSystemMetricCard
          icon="mdi-shield-check-outline"
          icon-class="sapling-system-metric__icon--state"
          :label="$t('system.status')"
          :value="state?.isReady ? $t('system.isReady') : $t('system.isNotReady')"
          :detail="state?.isReady ? $t('system.stableServices') : $t('system.followUpRequired')"
        />

        <SaplingSystemMetricCard
          icon="mdi-cpu-64-bit"
          icon-class="sapling-system-metric__icon--cpu"
          :label="$t('system.cpuUsage')"
          :value="cpuSpeedLoading ? '...' : formatPercentage(cpuLoadPercentage)"
          :detail="`${$t('system.user')} ${cpuSpeedLoading ? '...' : formatPercentage(cpuUserLoadPercentage)} · ${$t('system.systemUsage')} ${cpuSpeedLoading ? '...' : formatPercentage(cpuSystemLoadPercentage)}`"
        />

        <SaplingSystemMetricCard
          icon="mdi-memory"
          icon-class="sapling-system-metric__icon--memory"
          :label="$t('system.memory')"
          :value="memoryLoading ? '...' : formatGigabytes(memory?.used ?? 0)"
          :detail="`${memoryLoading ? '...' : formatPercentage(memoryUsagePercentage)} · ${memoryLoading ? '...' : formatGigabytes(memory?.total ?? 0)}`"
        />

        <SaplingSystemMetricCard
          icon="mdi-harddisk"
          icon-class="sapling-system-metric__icon--storage"
          :label="$t('system.filesystem')"
          :value="topFilesystem ? formatPercentage(topFilesystem.use) : '-'"
          :detail="topFilesystem ? topFilesystem.fs : $t('system.noStorage')"
        />

        <SaplingSystemMetricCard
          icon="mdi-lan"
          icon-class="sapling-system-metric__icon--network"
          :label="$t('system.network')"
          :value="networkLoading ? '...' : String(activeInterfaceCount)"
          :detail="totalNetworkRateDisplay"
        />
      </section>

      <section class="sapling-system-layout">
        <SaplingSystemOverviewPanel
          :hostname="displayValue(os?.hostname)"
          :details="overviewDetails"
          :error="overviewError"
        />

        <SaplingSystemPerformancePanel
          :title="cpu?.brand || $t('system.cpu')"
          :manufacturer="cpu?.manufacturer"
          :cpu-gauge-label="$t('system.cpuUsage')"
          :cpu-gauge-value="cpuSpeedLoading ? '...' : formatPercentage(cpuLoadPercentage)"
          :cpu-gauge-progress="cpuLoadPercentage"
          :memory-gauge-label="$t('system.memory')"
          :memory-gauge-value="memoryLoading ? '...' : formatPercentage(memoryUsagePercentage)"
          :memory-gauge-progress="memoryUsagePercentage"
          :details="performanceDetails"
          :error="performanceError"
        />
      </section>

      <SaplingSystemStoragePanel
        :count="filesystem.length"
        :items="storageItems"
        :empty-label="filesystemLoading ? '...' : $t('system.noStorage')"
        :error="filesystemError || ''"
      />

      <SaplingSystemNetworkPanel
        :active-interface-count="activeInterfaceCount"
        :items="networkItems"
        :empty-label="networkLoading ? '...' : $t('system.noNetwork')"
        :error="networkError || ''"
      />
    </template>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { NetworkInterface } from '@/entity/system';
import { useSaplingSystem } from '@/composables/system/useSaplingSystem';
import SaplingPageHero from '@/components/common/SaplingPageHero.vue';
import SaplingSystemMetricCard from '@/components/system/SaplingSystemMetricCard.vue';
import SaplingSystemNetworkPanel from '@/components/system/SaplingSystemNetworkPanel.vue';
import SaplingSystemOverviewPanel from '@/components/system/SaplingSystemOverviewPanel.vue';
import SaplingSystemPerformancePanel from '@/components/system/SaplingSystemPerformancePanel.vue';
import SaplingSystemStoragePanel from '@/components/system/SaplingSystemStoragePanel.vue';
// #endregion

// #region Composable
const {
  cpu, cpuLoading, cpuError,
  cpuSpeed, cpuSpeedLoading, cpuSpeedError,
  memory, memoryLoading, memoryError,
  filesystem, filesystemLoading, filesystemError,
  os, osLoading, osError,
  state, stateError,
  time, timeLoading, timeError,
  version, versionLoading, versionError,
  network, networkLoading, networkError,
  lastUpdated,
  isLoading,
  fetchAll,
  formatGigabytes,
  formatBytes,
  formatBytesPerSecond,
  formatPercentage,
  formatDateTime,
  formatUptime,
} = useSaplingSystem();
// #endregion

// #region State
const refreshing = ref(false);
const { t } = useI18n();
// #endregion

// #region Computed
const systemTitle = computed(() => os.value?.hostname || t('system.system'));

const systemSubtitle = computed(() => {
  const segments = [os.value?.distro, os.value?.release, os.value?.arch].filter(Boolean);
  return segments.length ? segments.join(' • ') : displayValue(os.value?.platform);
});

const osSummary = computed(() => [os.value?.distro, os.value?.release].filter(Boolean).join(' '));
const cpuLoadPercentage = computed(() => cpuSpeed.value?.currentLoad ?? 0);
const cpuUserLoadPercentage = computed(() => cpuSpeed.value?.currentLoadUser ?? 0);
const cpuSystemLoadPercentage = computed(() => cpuSpeed.value?.currentLoadSystem ?? 0);

const memoryUsagePercentage = computed(() => {
  if (!memory.value?.total) {
    return 0;
  }

  return (memory.value.used / memory.value.total) * 100;
});

const topFilesystem = computed(() => [...filesystem.value].sort((left, right) => right.use - left.use)[0] ?? null);

const activeInterfaceCount = computed(() => {
  return network.value.filter((iface) => isInterfaceActive(iface.operstate)).length;
});

const totalNetworkRateDisplay = computed(() => {
  if (networkLoading.value) {
    return '...';
  }

  const totalRate = network.value.reduce((sum, iface) => sum + iface.rx_sec + iface.tx_sec, 0);
  return formatBytesPerSecond(totalRate);
});

const formattedServerTime = computed(() => formatDateTime(time.value?.current));
const formattedUptime = computed(() => formatUptime(time.value?.uptime));
const versionDisplay = computed(() => version.value?.version ? `v${version.value.version}` : '-');

const timezoneDisplay = computed(() => {
  const parts = [time.value?.timezoneName, time.value?.timezone].filter(Boolean);
  return parts.length ? parts.join(' • ') : '-';
});

const lastUpdatedDisplay = computed(() => {
  if (!lastUpdated.value) {
    return '-';
  }

  return formatDateTime(lastUpdated.value.toISOString());
});

const cpuSpeedSummary = computed(() => {
  if (!cpu.value) {
    return '-';
  }

  return `${cpu.value.speed} GHz · min ${cpu.value.speedMin ?? cpu.value.speed} GHz · max ${cpu.value.speedMax ?? cpu.value.speed} GHz`;
});

const overviewDetails = computed(() => [
  { label: t('system.os'), value: osLoading.value ? '...' : displayValue(osSummary.value) },
  { label: t('system.kernel'), value: osLoading.value ? '...' : displayValue(os.value?.kernel) },
  { label: t('system.hostname'), value: osLoading.value ? '...' : displayValue(os.value?.hostname) },
  { label: t('system.arch'), value: osLoading.value ? '...' : displayValue(os.value?.arch) },
  { label: t('system.fqdn'), value: osLoading.value ? '...' : displayValue(os.value?.fqdn) },
  { label: t('system.codename'), value: osLoading.value ? '...' : displayValue(os.value?.codename) },
  { label: t('system.serverTime'), value: timeLoading.value ? '...' : formattedServerTime.value },
  { label: t('system.timezone'), value: timeLoading.value ? '...' : timezoneDisplay.value },
  { label: t('system.uptime'), value: timeLoading.value ? '...' : formattedUptime.value },
  { label: t('system.build'), value: versionLoading.value ? '...' : versionDisplay.value },
]);

const performanceDetails = computed(() => [
  { label: t('system.socket'), value: cpuLoading.value ? '...' : displayValue(cpu.value?.socket) },
  { label: t('system.speed'), value: cpuLoading.value ? '...' : cpuSpeedSummary.value },
  { label: t('system.cores'), value: cpuLoading.value ? '...' : displayValue(cpu.value?.cores) },
  { label: t('system.physicalCores'), value: cpuLoading.value ? '...' : displayValue(cpu.value?.physicalCores) },
  { label: t('system.processors'), value: cpuLoading.value ? '...' : displayValue(cpu.value?.processors) },
  {
    label: t('system.virtualization'),
    value: cpuLoading.value
      ? '...'
      : cpu.value?.virtualization
        ? t('system.virtualizationEnabled')
        : t('system.virtualizationDisabled'),
  },
  { label: t('system.total'), value: memoryLoading.value ? '...' : formatGigabytes(memory.value?.total ?? 0) },
  { label: t('system.available'), value: memoryLoading.value ? '...' : formatGigabytes(memory.value?.available ?? 0) },
]);

const overviewError = computed(() => osError.value || timeError.value || versionError.value || '');
const performanceError = computed(() => cpuError.value || cpuSpeedError.value || memoryError.value || '');

const storageItems = computed(() => filesystem.value.map((fs) => ({
  key: fs.fs,
  title: fs.fs,
  subtitle: fs.type,
  usageLabel: formatPercentage(fs.use),
  usageProgress: fs.use,
  sizeLabel: formatGigabytes(fs.size),
  usedLabel: formatGigabytes(fs.used),
  freeLabel: formatGigabytes(fs.available),
})));

const networkItems = computed(() => network.value.map((iface) => ({
  key: iface.iface,
  title: iface.iface,
  subtitle: interfaceStateLabel(iface.operstate),
  isActive: isInterfaceActive(iface.operstate),
  incidentCount: interfaceIncidentCount(iface),
  receivedLabel: formatBytes(iface.rx_bytes),
  sentLabel: formatBytes(iface.tx_bytes),
  receivedRateLabel: formatBytesPerSecond(iface.rx_sec),
  sentRateLabel: formatBytesPerSecond(iface.tx_sec),
  pingLabel: `${iface.ms} ms`,
  errorCount: iface.rx_errors + iface.tx_errors,
  dropCount: iface.rx_dropped + iface.tx_dropped,
})));
// #endregion

// #region Methods
function displayValue(value: string | number | null | undefined) {
  if (value == null || value === '') {
    return '-';
  }

  return String(value);
}

function isInterfaceActive(stateValue: string | null | undefined) {
  return String(stateValue || '').toLowerCase() === 'up';
}

function interfaceStateLabel(stateValue: string | null | undefined) {
  const label = displayValue(stateValue);
  return label === '-' ? t('system.unknownState') : label;
}

function interfaceIncidentCount(iface: NetworkInterface) {
  return iface.rx_errors + iface.tx_errors + iface.rx_dropped + iface.tx_dropped;
}

async function refreshDashboard() {
  refreshing.value = true;

  try {
    await fetchAll();
  } finally {
    refreshing.value = false;
  }
}
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingSystem.css"></style>