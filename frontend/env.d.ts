/// <reference types="vite/client" />

declare module 'vuetify/styles';

declare module 'markdown-it-task-lists' {
	import type { PluginSimple } from 'markdown-it';

	const markdownItTaskLists: PluginSimple;
	export default markdownItTaskLists;
}
