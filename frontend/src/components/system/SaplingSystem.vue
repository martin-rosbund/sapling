

<template>
  <v-container class="py-8" fluid>
    <v-row>
      <!-- System Info -->
      <v-col cols="12" md="12" lg="12">
        <v-card elevation="4" class="mb-4 glass-panel">
          <v-card-title>
            System:
            <span class="value-fixed" style="display:inline-block; min-width: 120px;">
              <template v-if="!osLoading && os">{{ os.hostname }} ({{ os.platform }})</template>
              <v-skeleton-loader v-else type="text" width="120px" class="transparent"/>
            </span>
          </v-card-title>
          <v-card-text>
            <div><b>Betriebssystem:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 180px;">
                <template v-if="!osLoading && os">{{ os.distro }} {{ os.release }} ({{ os.arch }})</template>
                <v-skeleton-loader v-else type="text" width="180px" class="transparent"/>
              </span>
            </div>
            <div><b>Kernel:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 100px;">
                <template v-if="!osLoading && os">{{ os.kernel }}</template>
                <v-skeleton-loader v-else type="text" width="100px" class="transparent"/>
              </span>
            </div>
            <div><b>FQDN:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 120px;">
                <template v-if="!osLoading && os">{{ os.fqdn }}</template>
                <v-skeleton-loader v-else type="text" width="120px" class="transparent"/>
              </span>
            </div>
            <div><b>Codepage:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 60px;">
                <template v-if="!osLoading && os">{{ os.codepage }}</template>
                <v-skeleton-loader v-else type="text" width="60px" class="transparent"/>
              </span>
            </div>
            <v-alert v-if="osError" type="error" dense>{{ osError }}</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- CPU Info -->
      <v-col cols="12" md="12" lg="12">
        <v-card elevation="4" class="mb-4 glass-panel">
          <v-card-title>
            CPU:
            <span class="value-fixed" style="display:inline-block; min-width: 120px;">
              <template v-if="!cpuLoading && cpu">{{ cpu.brand }} ({{ cpu.manufacturer }})</template>
              <v-skeleton-loader v-else type="text" width="120px" class="transparent"/>
            </span>
          </v-card-title>
          <v-card-text>
            <div><b>Sockel:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 60px;">
                <template v-if="!cpuLoading && cpu">{{ cpu.socket }}</template>
                <v-skeleton-loader v-else type="text" width="60px" class="transparent"/>
              </span>
            </div>
            <div><b>Stepping:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 30px;">
                <template v-if="!cpuLoading && cpu">{{ cpu.stepping }}</template>
                <v-skeleton-loader v-else type="text" width="30px" class="transparent"/>
              </span>
            </div>
			<div><b>Virtualization:</b>
			  <span class="value-fixed" style="display:inline-block; min-width: 40px;">
				<template v-if="!cpuLoading && cpu">{{ cpu.virtualization }}</template>
				<v-skeleton-loader v-else type="text" width="40px" class="transparent"/>
			  </span>
            </div>
            <div><b>Speed:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 120px;">
                <template v-if="!cpuLoading && cpu">{{ cpu.speed }} GHz (min: {{ cpu.speedMin }}, max: {{ cpu.speedMax }})</template>
                <v-skeleton-loader v-else type="text" width="120px" class="transparent"/>
              </span>
            </div>
            <div><b>Revision:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 40px;">
                <template v-if="!cpuLoading && cpu">{{ cpu.revision }}</template>
                <v-skeleton-loader v-else type="text" width="40px" class="transparent"/>
              </span>
            </div>
            <div class="mb-2 mt-4"><b>CPU-Auslastung:</b></div>
            <div style="min-height: 28px;">
              <template v-if="cpuSpeedLoading">
                <v-skeleton-loader type="text" width="100%" height="20px" class="transparent"/>
              </template>
              <template v-else>
                <v-progress-linear :model-value="cpuSpeed.currentLoad" color="primary" height="20" rounded>
                  <template #default>
                    <span>{{ (cpuSpeed.currentLoad).toFixed(1) }}%</span>
                  </template>
                </v-progress-linear>
                <div class="mt-2 text-caption">User: {{ (cpuSpeed.currentLoadUser).toFixed(1) }}% | System: {{ (cpuSpeed.currentLoadSystem).toFixed(1) }}%</div>
              </template>
            </div>
            <v-alert v-if="cpuError || cpuSpeedError" type="error" dense>{{ cpuError || cpuSpeedError }}</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Memory Info -->
      <v-col cols="12" md="12" lg="12">
        <v-card elevation="4" class="mb-4 glass-panel">
          <v-card-title>
            Arbeitsspeicher
            <span class="value-fixed" style="display:inline-block; min-width: 80px;">
              <v-skeleton-loader v-if="memoryLoading" type="text" width="80px" class="transparent"/>
            </span>
          </v-card-title>
          <v-card-text>
            <div class="mb-2"><b>Gesamt:</b>
              <span class="value-fixed" style="display:inline-block; min-width: 60px;">
                <template v-if="!memoryLoading && memory">{{ (memory.total / 1073741824).toFixed(1) }} GB</template>
                <v-skeleton-loader v-else type="text" width="60px" class="transparent"/>
              </span>
            </div>
            <div style="min-height: 28px;">
              <template v-if="memoryLoading">
                <v-skeleton-loader type="text" width="100%" height="20px" class="transparent"/>
              </template>
              <template v-else>
                <v-progress-linear :model-value="(memory.used / memory.total) * 100" color="deep-purple" height="20" rounded>
                  <template #default>
                    <span>{{ ((memory.used / memory.total) * 100).toFixed(1) }}%</span>
                  </template>
                </v-progress-linear>
              </template>
            </div>
            <div class="mt-2 text-caption">
              <span class="value-fixed" style="display:inline-block; min-width: 160px;">
                <template v-if="!memoryLoading && memory">Frei: {{ (memory.free / 1073741824).toFixed(1) }} GB | Verfügbar: {{ (memory.available / 1073741824).toFixed(1) }} GB</template>
                <v-skeleton-loader v-else type="text" width="160px" class="transparent"/>
              </span>
            </div>
            <v-alert v-if="memoryError" type="error" dense>{{ memoryError }}</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Filesystem Info -->
      <v-col cols="12" md="12" lg="12">
        <v-card elevation="4" class="glass-panel">
          <v-card-title>
            Festplatten
            <span class="value-fixed" style="display:inline-block; min-width: 80px;">
              <v-skeleton-loader v-if="filesystemLoading" type="text" width="80px" class="transparent"/>
            </span>
          </v-card-title>
          <v-card-text>
            <v-row v-if="filesystem && filesystem.length">
              <v-col v-for="fs in filesystem" :key="fs.fs" cols="12" md="6" lg="4">
                <v-card class="mb-2 glass-panel" outlined>
                  <v-card-title>{{ fs.fs }} ({{ fs.type }})</v-card-title>
                  <v-card-text>
                    <div><b>Größe:</b>
                      <span class="value-fixed" style="display:inline-block; min-width: 60px;">
                        <template v-if="!filesystemLoading">{{ (fs.size / 1073741824).toFixed(1) }} GB</template>
                        <v-skeleton-loader v-else type="text" width="60px" class="transparent"/>
                      </span>
                    </div>
                    <div><b>Belegt:</b>
                      <span class="value-fixed" style="display:inline-block; min-width: 60px;">
                        <template v-if="!filesystemLoading">{{ (fs.used / 1073741824).toFixed(1) }} GB</template>
                        <v-skeleton-loader v-else type="text" width="60px" class="transparent"/>
                      </span>
                    </div>
                    <div style="min-height: 24px;">
                      <template v-if="filesystemLoading">
                        <v-skeleton-loader type="text" width="100%" height="16px" class="transparent"/>
                      </template>
                      <template v-else>
                        <v-progress-linear :model-value="fs.use" color="teal" height="16" rounded>
                          <template #default>
                            <span>{{ fs.use.toFixed(1) }}%</span>
                          </template>
                        </v-progress-linear>
                      </template>
                    </div>
                    <div class="mt-1 text-caption">
                      <span class="value-fixed" style="display:inline-block; min-width: 60px;">
                        <template v-if="!filesystemLoading">Frei: {{ (fs.available / 1073741824).toFixed(1) }} GB</template>
                        <v-skeleton-loader v-else type="text" width="60px" class="transparent"/>
                      </span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-skeleton-loader v-else :loading="filesystemLoading" type="table" width="100%" height="80px"/>
            <v-alert v-if="filesystemError" type="error" dense>{{ filesystemError }}</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { useSaplingSystem } from '@/composables/system/useSaplingSystem';

const {
	cpu, cpuLoading, cpuError,
	cpuSpeed, cpuSpeedLoading, cpuSpeedError,
	memory, memoryLoading, memoryError,
	filesystem, filesystemLoading, filesystemError,
	os, osLoading, osError,
} = useSaplingSystem();
</script>
