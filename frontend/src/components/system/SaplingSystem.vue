
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
        <article class="sapling-system-metric glass-panel">
          <div class="sapling-system-metric__icon sapling-system-metric__icon--state">
            <v-icon icon="mdi-shield-check-outline" />
          </div>
          <div class="sapling-system-metric__copy">
            <p>{{ $t('system.status') }}</p>
            <strong>{{ state?.isReady ? $t('system.isReady') : $t('system.isNotReady') }}</strong>
            <span>{{ state?.isReady ? $t('system.stableServices') : $t('system.followUpRequired') }}</span>
          </div>
        </article>

        <article class="sapling-system-metric glass-panel">
          <div class="sapling-system-metric__icon sapling-system-metric__icon--cpu">
            <v-icon icon="mdi-cpu-64-bit" />
          </div>
          <div class="sapling-system-metric__copy">
            <p>{{ $t('system.cpuUsage') }}</p>
            <strong>{{ cpuSpeedLoading ? '...' : formatPercentage(cpuLoadPercentage) }}</strong>
            <span>
              {{ $t('system.user') }} {{ cpuSpeedLoading ? '...' : formatPercentage(cpuUserLoadPercentage) }}
              · {{ $t('system.systemUsage') }} {{ cpuSpeedLoading ? '...' : formatPercentage(cpuSystemLoadPercentage) }}
            </span>
          </div>
        </article>

        <article class="sapling-system-metric glass-panel">
          <div class="sapling-system-metric__icon sapling-system-metric__icon--memory">
            <v-icon icon="mdi-memory" />
          </div>
          <div class="sapling-system-metric__copy">
            <p>{{ $t('system.memory') }}</p>
            <strong>{{ memoryLoading ? '...' : formatGigabytes(memory?.used ?? 0) }}</strong>
            <span>
              {{ memoryLoading ? '...' : formatPercentage(memoryUsagePercentage) }}
              · {{ memoryLoading ? '...' : formatGigabytes(memory?.total ?? 0) }}
            </span>
          </div>
        </article>

        <article class="sapling-system-metric glass-panel">
          <div class="sapling-system-metric__icon sapling-system-metric__icon--storage">
            <v-icon icon="mdi-harddisk" />
          </div>
          <div class="sapling-system-metric__copy">
            <p>{{ $t('system.filesystem') }}</p>
            <strong>{{ topFilesystem ? formatPercentage(topFilesystem.use) : '-' }}</strong>
            <span>{{ topFilesystem ? topFilesystem.fs : $t('system.noStorage') }}</span>
          </div>
        </article>

        <article class="sapling-system-metric glass-panel">
          <div class="sapling-system-metric__icon sapling-system-metric__icon--network">
            <v-icon icon="mdi-lan" />
          </div>
          <div class="sapling-system-metric__copy">
            <p>{{ $t('system.network') }}</p>
            <strong>{{ networkLoading ? '...' : String(activeInterfaceCount) }}</strong>
            <span>{{ totalNetworkRateDisplay }}</span>
          </div>
        </article>
      </section>

      <section class="sapling-system-layout">
        <article class="sapling-system-panel glass-panel">
          <div class="sapling-system-panel__header">
            <div>
              <p class="sapling-system-panel__eyebrow">{{ $t('system.overview') }}</p>
              <h2 class="sapling-system-panel__title">{{ $t('system.system') }}</h2>
            </div>
            <v-chip size="small" variant="outlined">
              {{ displayValue(os?.hostname) }}
            </v-chip>
          </div>

          <div class="sapling-system-details-grid">
            <div class="sapling-system-detail">
              <span>{{ $t('system.os') }}</span>
              <strong>{{ osLoading ? '...' : displayValue(osSummary) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.kernel') }}</span>
              <strong>{{ osLoading ? '...' : displayValue(os?.kernel) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.hostname') }}</span>
              <strong>{{ osLoading ? '...' : displayValue(os?.hostname) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.arch') }}</span>
              <strong>{{ osLoading ? '...' : displayValue(os?.arch) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.fqdn') }}</span>
              <strong>{{ osLoading ? '...' : displayValue(os?.fqdn) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.codename') }}</span>
              <strong>{{ osLoading ? '...' : displayValue(os?.codename) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.serverTime') }}</span>
              <strong>{{ timeLoading ? '...' : formattedServerTime }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.timezone') }}</span>
              <strong>{{ timeLoading ? '...' : timezoneDisplay }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.uptime') }}</span>
              <strong>{{ timeLoading ? '...' : formattedUptime }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.build') }}</span>
              <strong>{{ versionLoading ? '...' : versionDisplay }}</strong>
            </div>
          </div>

          <v-alert v-if="osError || timeError || versionError" type="error" density="comfortable" variant="tonal">
            {{ osError || timeError || versionError }}
          </v-alert>
        </article>

        <article class="sapling-system-panel glass-panel">
          <div class="sapling-system-panel__header">
            <div>
              <p class="sapling-system-panel__eyebrow">{{ $t('system.performance') }}</p>
              <h2 class="sapling-system-panel__title">{{ cpu?.brand || $t('system.cpu') }}</h2>
            </div>
            <v-chip v-if="cpu" size="small" variant="tonal" color="primary">
              {{ cpu.manufacturer }}
            </v-chip>
          </div>

          <div class="sapling-system-performance">
            <div class="sapling-system-gauge">
              <div class="sapling-system-gauge__copy">
                <span>{{ $t('system.cpuUsage') }}</span>
                <strong>{{ cpuSpeedLoading ? '...' : formatPercentage(cpuLoadPercentage) }}</strong>
              </div>
              <v-progress-linear :model-value="cpuLoadPercentage" color="primary" height="16" rounded />
            </div>

            <div class="sapling-system-gauge">
              <div class="sapling-system-gauge__copy">
                <span>{{ $t('system.memory') }}</span>
                <strong>{{ memoryLoading ? '...' : formatPercentage(memoryUsagePercentage) }}</strong>
              </div>
              <v-progress-linear :model-value="memoryUsagePercentage" color="teal" height="16" rounded />
            </div>
          </div>

          <div class="sapling-system-details-grid">
            <div class="sapling-system-detail">
              <span>{{ $t('system.socket') }}</span>
              <strong>{{ cpuLoading ? '...' : displayValue(cpu?.socket) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.speed') }}</span>
              <strong>{{ cpuLoading ? '...' : cpuSpeedSummary }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.cores') }}</span>
              <strong>{{ cpuLoading ? '...' : displayValue(cpu?.cores) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.physicalCores') }}</span>
              <strong>{{ cpuLoading ? '...' : displayValue(cpu?.physicalCores) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.processors') }}</span>
              <strong>{{ cpuLoading ? '...' : displayValue(cpu?.processors) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.virtualization') }}</span>
              <strong>
                {{ cpuLoading ? '...' : cpu?.virtualization ? $t('system.virtualizationEnabled') : $t('system.virtualizationDisabled') }}
              </strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.total') }}</span>
              <strong>{{ memoryLoading ? '...' : formatGigabytes(memory?.total ?? 0) }}</strong>
            </div>
            <div class="sapling-system-detail">
              <span>{{ $t('system.available') }}</span>
              <strong>{{ memoryLoading ? '...' : formatGigabytes(memory?.available ?? 0) }}</strong>
            </div>
          </div>

          <v-alert v-if="cpuError || cpuSpeedError || memoryError" type="error" density="comfortable" variant="tonal">
            {{ cpuError || cpuSpeedError || memoryError }}
          </v-alert>
        </article>
      </section>

      <section class="sapling-system-panel glass-panel">
        <div class="sapling-system-panel__header">
          <div>
            <p class="sapling-system-panel__eyebrow">{{ $t('system.filesystem') }}</p>
            <h2 class="sapling-system-panel__title">{{ $t('system.storageTitle') }}</h2>
          </div>
          <v-chip size="small" variant="outlined">
            {{ filesystem.length }}
          </v-chip>
        </div>

        <div v-if="filesystem.length" class="sapling-system-storage-grid">
          <article v-for="fs in filesystem" :key="fs.fs" class="sapling-system-storage-card">
            <div class="sapling-system-storage-card__header">
              <div>
                <h3>{{ fs.fs }}</h3>
                <p>{{ fs.type }}</p>
              </div>
              <v-chip size="small" variant="tonal" color="primary">
                {{ formatPercentage(fs.use) }}
              </v-chip>
            </div>

            <v-progress-linear :model-value="fs.use" color="amber" height="14" rounded />

            <div class="sapling-system-storage-card__stats">
              <div>
                <span>{{ $t('system.size') }}</span>
                <strong>{{ formatGigabytes(fs.size) }}</strong>
              </div>
              <div>
                <span>{{ $t('system.used') }}</span>
                <strong>{{ formatGigabytes(fs.used) }}</strong>
              </div>
              <div>
                <span>{{ $t('system.diskFree') }}</span>
                <strong>{{ formatGigabytes(fs.available) }}</strong>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="sapling-system-empty-state">
          {{ filesystemLoading ? '...' : $t('system.noStorage') }}
        </div>

        <v-alert v-if="filesystemError" type="error" density="comfortable" variant="tonal">
          {{ filesystemError }}
        </v-alert>
      </section>

      <section class="sapling-system-panel glass-panel">
        <div class="sapling-system-panel__header">
          <div>
            <p class="sapling-system-panel__eyebrow">{{ $t('system.network') }}</p>
            <h2 class="sapling-system-panel__title">{{ $t('system.networkTitle') }}</h2>
          </div>
          <v-chip size="small" variant="outlined">
            {{ activeInterfaceCount }} {{ $t('system.activeInterfaces') }}
          </v-chip>
        </div>

        <div v-if="network.length" class="sapling-system-network-grid">
          <article v-for="iface in network" :key="iface.iface" class="sapling-system-network-card">
            <div class="sapling-system-network-card__header">
              <div>
                <h3>{{ iface.iface }}</h3>
                <p>{{ interfaceStateLabel(iface.operstate) }}</p>
              </div>
              <div class="sapling-system-network-card__chips">
                <v-chip
                  size="small"
                  :color="isInterfaceActive(iface.operstate) ? 'success' : 'default'"
                  :variant="isInterfaceActive(iface.operstate) ? 'tonal' : 'outlined'"
                >
                  {{ interfaceStateLabel(iface.operstate) }}
                </v-chip>
                <v-chip
                  v-if="interfaceIncidentCount(iface) > 0"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  {{ interfaceIncidentCount(iface) }} {{ $t('system.incidents') }}
                </v-chip>
              </div>
            </div>

            <div class="sapling-system-network-card__stats">
              <div>
                <span>{{ $t('system.received') }}</span>
                <strong>{{ formatBytes(iface.rx_bytes) }}</strong>
              </div>
              <div>
                <span>{{ $t('system.sent') }}</span>
                <strong>{{ formatBytes(iface.tx_bytes) }}</strong>
              </div>
              <div>
                <span>{{ $t('system.receivedPerSec') }}</span>
                <strong>{{ formatBytesPerSecond(iface.rx_sec) }}</strong>
              </div>
              <div>
                <span>{{ $t('system.sentPerSec') }}</span>
                <strong>{{ formatBytesPerSecond(iface.tx_sec) }}</strong>
              </div>
            </div>

            <div class="sapling-system-network-health">
              <div>
                <span>{{ $t('system.ping') }}</span>
                <strong>{{ iface.ms }} ms</strong>
              </div>
              <div>
                <span>{{ $t('system.errors') }}</span>
                <strong>{{ iface.rx_errors + iface.tx_errors }}</strong>
              </div>
              <div>
                <span>{{ $t('system.drops') }}</span>
                <strong>{{ iface.rx_dropped + iface.tx_dropped }}</strong>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="sapling-system-empty-state">
          {{ networkLoading ? '...' : $t('system.noNetwork') }}
        </div>

        <v-alert v-if="networkError" type="error" density="comfortable" variant="tonal">
          {{ networkError }}
        </v-alert>
      </section>
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