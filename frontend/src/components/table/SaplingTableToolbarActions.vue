<template>
  <v-btn-group
    class="sapling-table-toolbar-action-group"
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
            :title="$t('global.download')"
            :disabled="isDownloadingJson"
            @click="emit('download')"
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
            <v-icon>mdi-star-outline</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" class="glass-panel" nav>
          <v-list-item
            prepend-icon="mdi-content-save-outline"
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
                  favoriteItem.handle === activeFavoriteHandle ? 'mdi-star' : 'mdi-star-outline'
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
            <v-icon>mdi-star-outline</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" class="glass-panel" nav>
          <v-list-item
            prepend-icon="mdi-content-save-outline"
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
                  favoriteItem.handle === activeFavoriteHandle ? 'mdi-star' : 'mdi-star-outline'
                }}</v-icon>
              </template>
              <v-list-item-title>{{ favoriteItem.title }}</v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>
      <v-btn
        class="sapling-table-toolbar-action sapling-table-toolbar-action--download"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-download"
        :title="$t('global.download')"
        :aria-label="$t('global.download')"
        :loading="isDownloadingJson"
        :disabled="isDownloadingJson"
        @click="emit('download')"
      >
        {{ $t('global.download') }}
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
  refreshButtonLabel: string
  showFavorite: boolean
  showAdd: boolean
  favoriteItems: FavoriteItem[]
  isFavoritesLoading: boolean
  activeFavoriteHandle?: number | null
}>()

const emit = defineEmits<{
  download: []
  refresh: []
  favorite: []
  selectFavorite: [favorite: FavoriteItem]
  add: []
}>()
</script>
