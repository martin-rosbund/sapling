<template>
	<v-btn-group
		class="sapling-table-toolbar-action-group"
		:density="isMobileTable ? 'compact' : 'comfortable'"
		rounded="pill"
		divided
	>
		<template v-if="isMobileTable">
			<v-btn
				class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--download"
				color="primary"
				variant="tonal"
				icon
				:title="$t('global.download')"
				:aria-label="$t('global.download')"
				:loading="isDownloadingJson"
				:disabled="isDownloadingJson"
				@click="emit('download')"
			>
				<v-icon>mdi-download</v-icon>
			</v-btn>
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
			<v-btn
				v-if="showFavorite"
				class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
				color="primary"
				variant="tonal"
				icon
				:title="$t('global.saveAsFavorite')"
				:aria-label="$t('global.saveAsFavorite')"
				@click="emit('favorite')"
			>
				<v-icon>mdi-star-outline</v-icon>
			</v-btn>
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
			<v-btn
				v-if="showFavorite"
				class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
				color="primary"
				variant="tonal"
				icon
				:title="$t('global.saveAsFavorite')"
				:aria-label="$t('global.saveAsFavorite')"
				@click="emit('favorite')"
			>
				<v-icon>mdi-star-outline</v-icon>
			</v-btn>
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
defineProps<{
	isMobileTable: boolean
	isDownloadingJson: boolean
	refreshButtonLabel: string
	showFavorite: boolean
	showAdd: boolean
}>()

const emit = defineEmits<{
	download: []
	refresh: []
	favorite: []
	add: []
}>()
</script>
