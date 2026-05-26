<template>
  <v-btn-group
    class="sapling-action-button-group sapling-table-toolbar-action-group"
    :density="isMobileTable ? 'compact' : 'comfortable'"
    rounded="pill"
    divided
  >
    <slot name="leading" />

    <template v-if="isMobileTable">
      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn
            class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
            color="primary"
            variant="tonal"
            icon
            v-bind="menuProps"
            :title="$t('global.more')"
            :aria-label="$t('global.more')"
          >
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" class="glass-panel" nav>
          <v-list-item
            prepend-icon="mdi-refresh"
            :title="refreshButtonLabel"
            @click="emit('refresh')"
          />
          <v-list-item
            prepend-icon="mdi-download"
            :title="$t('global.downloadJson')"
            :disabled="isDownloadingJson"
            @click="emit('downloadJson')"
          />
          <v-list-item
            prepend-icon="mdi-file-delimited-outline"
            :title="$t('global.downloadCsv')"
            :disabled="isDownloadingJson"
            @click="emit('downloadCsv')"
          />
          <v-list-item
            prepend-icon="mdi-table-arrow-down"
            :title="$t('global.downloadCsvTemplate')"
            @click="emit('downloadCsvTemplate')"
          />
          <v-list-item
            v-if="showImport"
            prepend-icon="mdi-file-import-outline"
            :title="$t('global.importCsv')"
            :disabled="isImportingCsv"
            @click="emit('importCsv')"
          />
        </v-list>
      </v-menu>

      <v-menu v-if="showFavorite" location="bottom end">
        <template #activator="{ props: favoriteMenuProps }">
          <v-btn
            class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
            color="primary"
            variant="tonal"
            icon
            :loading="isFavoritesLoading"
            v-bind="favoriteMenuProps"
            :title="$t('navigation.favorite')"
            :aria-label="$t('navigation.favorite')"
          >
            <v-icon>mdi-bookmark-outline</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" class="glass-panel" nav>
          <v-list-item
            prepend-icon="mdi-bookmark-plus"
            :title="$t('global.saveAsFavorite')"
            @click="emit('favorite')"
          />

          <template v-if="favoriteItems.length > 0">
            <v-divider />
            <v-list-subheader>{{ $t('navigation.favorite') }}</v-list-subheader>

            <v-list-item
              v-for="favoriteItem in favoriteItems"
              :key="favoriteItem.handle"
              :active="favoriteItem.handle === activeFavoriteHandle"
              @click="emit('selectFavorite', favoriteItem)"
            >
              <template #prepend>
                <v-icon>{{
                  favoriteItem.handle === activeFavoriteHandle
                    ? 'mdi-bookmark'
                    : 'mdi-bookmark-outline'
                }}</v-icon>
              </template>
              <v-list-item-title>{{ favoriteItem.title }}</v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>

      <v-btn
        v-if="showAdd"
        class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--add"
        color="primary"
        variant="flat"
        icon
        :title="$t('global.add')"
        :aria-label="$t('global.add')"
        @click="emit('add')"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </template>

    <template v-else>
      <v-btn
        class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
        color="primary"
        variant="tonal"
        icon
        :title="refreshButtonLabel"
        :aria-label="refreshButtonLabel"
        @click="emit('refresh')"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-menu v-if="showFavorite" location="bottom end">
        <template #activator="{ props: favoriteMenuProps }">
          <v-btn
            class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
            color="primary"
            variant="tonal"
            icon
            :loading="isFavoritesLoading"
            v-bind="favoriteMenuProps"
            :title="$t('navigation.favorite')"
            :aria-label="$t('navigation.favorite')"
          >
            <v-icon>mdi-bookmark-outline</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" class="glass-panel" nav>
          <v-list-item
            prepend-icon="mdi-bookmark-plus"
            :title="$t('global.saveAsFavorite')"
            @click="emit('favorite')"
          />

          <template v-if="favoriteItems.length > 0">
            <v-divider />
            <v-list-subheader>{{ $t('navigation.favorite') }}</v-list-subheader>

            <v-list-item
              v-for="favoriteItem in favoriteItems"
              :key="favoriteItem.handle"
              :active="favoriteItem.handle === activeFavoriteHandle"
              @click="emit('selectFavorite', favoriteItem)"
            >
              <template #prepend>
                <v-icon>{{
                  favoriteItem.handle === activeFavoriteHandle
                    ? 'mdi-bookmark'
                    : 'mdi-bookmark-outline'
                }}</v-icon>
              </template>
              <v-list-item-title>{{ favoriteItem.title }}</v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>
      <v-menu location="bottom end">
        <template #activator="{ props: downloadMenuProps }">
          <v-btn
            class="sapling-table-toolbar-action sapling-table-toolbar-action--download"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download"
            append-icon="mdi-menu-down"
            v-bind="downloadMenuProps"
            :title="$t('global.download')"
            :aria-label="$t('global.download')"
            :loading="isDownloadingJson"
            :disabled="isDownloadingJson"
          >
            {{ $t('global.download') }}
          </v-btn>
        </template>

        <v-list density="compact" class="glass-panel" nav>
          <v-list-item
            prepend-icon="mdi-code-json"
            :title="$t('global.downloadJson')"
            @click="emit('downloadJson')"
          />
          <v-list-item
            prepend-icon="mdi-file-delimited-outline"
            :title="$t('global.downloadCsv')"
            @click="emit('downloadCsv')"
          />
          <v-list-item
            prepend-icon="mdi-table-arrow-down"
            :title="$t('global.downloadCsvTemplate')"
            @click="emit('downloadCsvTemplate')"
          />
        </v-list>
      </v-menu>
      <v-btn
        v-if="showImport"
        class="sapling-table-toolbar-action sapling-table-toolbar-action--import"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-file-import-outline"
        :title="$t('global.importCsv')"
        :aria-label="$t('global.importCsv')"
        :loading="isImportingCsv"
        :disabled="isImportingCsv"
        @click="emit('importCsv')"
      >
        {{ $t('global.importCsv') }}
      </v-btn>
      <v-btn
        v-if="showAdd"
        class="sapling-table-toolbar-action sapling-table-toolbar-action--add"
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        :title="$t('global.add')"
        :aria-label="$t('global.add')"
        @click="emit('add')"
      >
        {{ $t('global.add') }}
      </v-btn>
    </template>
  </v-btn-group>
</template>

<script lang="ts" setup>
import type { FavoriteItem } from '@/entity/entity'

defineProps<{
  isMobileTable: boolean
  isDownloadingJson: boolean
  isImportingCsv: boolean
  refreshButtonLabel: string
  showFavorite: boolean
  showImport: boolean
  showAdd: boolean
  favoriteItems: FavoriteItem[]
  isFavoritesLoading: boolean
  activeFavoriteHandle?: number | null
}>()

const emit = defineEmits<{
  downloadJson: []
  downloadCsv: []
  downloadCsvTemplate: []
  importCsv: []
  refresh: []
  favorite: []
  selectFavorite: [favorite: FavoriteItem]
  add: []
}>()
</script>
