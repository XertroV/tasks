// Phosphor green with varying brightness
export const PHOSPHOR_GREEN = '#33FF33';
export const PHOSPHOR_GREEN_DIM = '#228822';
export const PHOSPHOR_GREEN_BRIGHT = '#44FF44';

// Link cyan
export const LINK_CYAN = '#00FFFF';
export const LINK_CYAN_DIM = '#008888';

// Code amber
export const CODE_AMBER = '#FFAA00';

// Horror red
export const HORROR_RED = '#FF0000';
export const HORROR_RED_DIM = '#880000';

// Background
export const CRT_BLACK = '#0A0A0A';
export const CRT_BLACK_PURE = '#000000';

// Text styling helpers
export const TEXT_COLORS = {
  body: PHOSPHOR_GREEN,
  heading: PHOSPHOR_GREEN_BRIGHT,
  code: CODE_AMBER,
  link: LINK_CYAN,
  error: HORROR_RED,
  osd: PHOSPHOR_GREEN,
  timecode: CODE_AMBER,
};

// Emissive intensities for drei Text
export const TEXT_EMISSIVE = {
  body: 0.3,
  heading: 0.5,
  code: 0.4,
  link: 0.6,
  error: 0.8,
};
