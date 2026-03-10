<template>
	<v-container class="sapling-scrollable" fluid>
		<v-row>
			<SaplingIssuesOpen />
			<SaplingIssuesClosed />
		</v-row>
	</v-container>
</template>

<script lang="ts" setup>
import SaplingIssuesOpen from './SaplingIssuesOpen.vue';
import SaplingIssuesClosed from './SaplingIssuesClosed.vue';
</script>