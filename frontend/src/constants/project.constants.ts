export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL;
export const GIT_URL: string = import.meta.env.VITE_GIT_URL;
export const PORT: number = parseInt(import.meta.env.VITE_PORT) || 5173;

export const DEFAULT_SMALL_WINDOW_WIDTH: number = parseInt(import.meta.env.VITE_DEFAULT_SMALL_WINDOW_WIDTH) || 900;
export const DEFAULT_MEDIUM_WINDOW_WIDTH: number = parseInt(import.meta.env.VITE_DEFAULT_MEDIUM_WINDOW_WIDTH) || 1200;
export const DEFAULT_LARGE_WINDOW_WIDTH: number = parseInt(import.meta.env.VITE_DEFAULT_LARGE_WINDOW_WIDTH) || 1500;

export const DEFAULT_PAGE_SIZE_SMALL: number = parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE_SMALL) || 10;
export const DEFAULT_PAGE_SIZE_MEDIUM: number = parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE_MEDIUM) || 25;
export const DEFAULT_PAGE_SIZE_LARGE: number = parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE_LARGE) || 50;
export const DEFAULT_PAGE_SIZE_OPTIONS: number[] = import.meta.env.VITE_DEFAULT_PAGE_SIZE_OPTIONS
  ? import.meta.env.VITE_DEFAULT_PAGE_SIZE_OPTIONS.split(',').map(Number)
  : [10, 25, 50, 100];
export const DEFAULT_ENTITY_ITEMS_COUNT: number = parseInt(import.meta.env.VITE_DEFAULT_ENTITY_ITEMS_COUNT) || 1000;
export const DEBUG_USERNAME: string = import.meta.env.VITE_DEBUG_USERNAME || '';
export const DEBUG_PASSWORD: string = import.meta.env.VITE_DEBUG_PASSWORD || '';

export const IS_LOGIN_WITH_AZURE_ENABLED: boolean = import.meta.env.VITE_IS_LOGIN_WITH_AZURE_ENABLED === 'true';
export const IS_LOGIN_WITH_GOOGLE_ENABLED: boolean = import.meta.env.VITE_IS_LOGIN_WITH_GOOGLE_ENABLED === 'true';
export const AI_AGENT_NAME: string = import.meta.env.VITE_AI_AGENT_NAME || 'Saplina';
export const NAVIGATION_URL: string = import.meta.env.VITE_NAVIGATION_URL || 'https://www.google.com/maps/dir/?api=1&destination=';