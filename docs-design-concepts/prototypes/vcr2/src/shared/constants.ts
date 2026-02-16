// CRT Screen Colors - import from colors.ts to avoid duplication
export {
	CRT_BLACK,
	CRT_BLACK_PURE,
	PHOSPHOR_GREEN,
	PHOSPHOR_GREEN_DIM,
	PHOSPHOR_GREEN_BRIGHT,
	LINK_CYAN,
	CODE_AMBER,
	HORROR_RED,
	TEXT_COLORS,
	TEXT_EMISSIVE,
} from './colors';

// Aliases for backwards compatibility
export { LINK_CYAN as CYAN_LINK, CODE_AMBER as AMBER_CODE, HORROR_RED as RED_HORROR } from './colors';

// Zapper Colors
export const ZAPPER_BARREL = '#E85D04';
export const ZAPPER_GRIP = '#1A1A1A';
export const ZAPPER_TRIGGER_GUARD = '#333333';
export const ZAPPER_TRIGGER = '#4A4A4A';

// Room Colors
export const WALLPAPER_BASE = '#C4B18C';
export const CARPET_BASE = '#6B5B4F';
export const CEILING_BASE = '#E8E8E8';

// Room Dimensions
export const ROOM_WIDTH = 6;
export const ROOM_DEPTH = 8;
export const ROOM_HEIGHT = 2.74;
export const HALLWAY_OPENING_WIDTH = 2;

// Camera
export const DEFAULT_CAMERA_POSITION = [0, 1.2, -4] as const;
export const DEFAULT_CAMERA_TARGET = [0, 0.9, -7] as const;
export const DEFAULT_FOV = 60;

// Performance Budgets
export const TARGET_FPS = 60;
export const MAX_DRAW_CALLS = 50;
export const MAX_VERTICES = 50000;
export const MAX_MEMORY_MB = 200;

// Tape Model
export const PAGE_DURATION_SECONDS = 150;
export const TOTAL_PAGES = 48;
export const TOTAL_TAPE_DURATION = PAGE_DURATION_SECONDS * TOTAL_PAGES; // 7200s = 2:00:00

// VHS Defaults - See src/postprocessing/VHSPass.ts for actual VHS shader uniform defaults
// These were consolidated into VHS_DEFAULT_UNIFORMS in VHSPass.ts

// Horror Timeline
export const HORROR_PHASE_DURATIONS = {
  DORMANT: 60,
  UNEASY: 60,
  ESCALATING: 60,
  CLIMAX: 30,
  POST: Number.POSITIVE_INFINITY,
};
export const HORROR_TOTAL_DURATION = 210; // 3.5 minutes

// Debug
export const IS_DEBUG = import.meta.env.DEV;
export const PERFORMANCE_METRICS_INTERVAL = 250; // ms (4Hz)
