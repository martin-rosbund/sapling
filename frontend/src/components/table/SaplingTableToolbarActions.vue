<template>
	<v-btn-group
		class="sapling-table-toolbar-action-group"
		:density="isMobileTable ? 'compact' : 'comfortable'"
		rounded="pill"
		divided
	>
		<slot name="leading" />

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

			<v-list density="compact"  class="glass-panel" nav>
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
				<v-list-item
					v-if="showFavorite"
					prepend-icon="mdi-star-outline"
					:title="$t('global.saveAsFavorite')"
					@click="emit('favorite')"
				/>
			</v-list>
		</v-menu>

		<v-btn
			v-if="showAdd"
			class="sapling-table-toolbar-action sapling-table-toolbar-action--add"
			color="primary"
			variant="flat"
			:icon="isMobileTable"
			:prepend-icon="isMobileTable ? undefined : 'mdi-plus'"
			:title="$t('global.add')"
			:aria-label="$t('global.add')"
			@click="emit('add')"
		>
			<v-icon v-if="isMobileTable">mdi-plus</v-icon>
			<template v-else>{{ $t('global.add') }}</template>
		</v-btn>
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
