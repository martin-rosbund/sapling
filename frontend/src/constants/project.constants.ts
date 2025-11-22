export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL;
export const GIT_URL: string = import.meta.env.VITE_GIT_URL;

export const DEFAULT_PAGE_SIZE_SMALL: number = parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE_SMALL) || 10;
export const DEFAULT_PAGE_SIZE_MEDIUM: number = parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE_MEDIUM) || 25;
export const DEFAULT_PAGE_SIZE_LARGE: number = parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE_LARGE) || 50;
export const DEFAULT_PAGE_SIZE_OPTIONS: number[] = JSON.parse(import.meta.env.VITE_DEFAULT_PAGE_SIZE_OPTIONS || '[10, 25, 50, 100]');
export const DEFAULT_ENTITY_ITEMS_COUNT: number = parseInt(import.meta.env.VITE_DEFAULT_ENTITY_ITEMS_COUNT) || 1000;

export const DEBUG_USERNAME: string = import.meta.env.VITE_DEBUG_USERNAME || '';
export const DEBUG_PASSWORD: string = import.meta.env.VITE_DEBUG_PASSWORD || '';

export const ENTITY_SYSTEM_COLUMNS: string[] = import.meta.env.VITE_ENTITY_SYSTEM_COLUMNS || [];

export const IS_LOGIN_WITH_AZURE_ENABLED: boolean = import.meta.env.VITE_IS_LOGIN_WITH_AZURE_ENABLED === 'true';
export const IS_LOGIN_WITH_GOOGLE_ENABLED: boolean = import.meta.env.VITE_IS_LOGIN_WITH_GOOGLE_ENABLED === 'true';

export const AI_AGENT_NAME: string = import.meta.env.VITE_AI_AGENT_NAME || 'Saplina';