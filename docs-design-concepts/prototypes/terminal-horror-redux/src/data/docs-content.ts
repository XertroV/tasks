// Documentation content for VHS display

export const WELCOME_MESSAGE = `
VHS DOCUMENTATION SYSTEM v2.1
==============================

INSERT TAPE TO BEGIN

[ REW ] [ PLAY ] [ FF ] [ EJECT ]
`;

export const MENU_ITEMS = [
  { id: 'getting-started', label: 'GETTING STARTED', href: '/docs/getting-started' },
  { id: 'api-reference', label: 'API REFERENCE', href: '/docs/api' },
  { id: 'configuration', label: 'CONFIGURATION', href: '/docs/config' },
  { id: 'troubleshooting', label: 'TROUBLESHOOTING', href: '/docs/troubleshooting' },
];

export const HORROR_MESSAGES = [
  'THE TAPE IS ENDLESS',
  'THE RECORDING NEVER STOPS',
  'YOU HAVE BEEN ARCHIVED',
  'PLAY',
  'P̶L̵A̷Y̶',
];

export interface DocSection {
  id: string;
  title: string;
  content: string;
  links?: { label: string; href: string }[];
}

export const DOC_SECTIONS: Record<string, DocSection> = {
  'getting-started': {
    id: 'getting-started',
    title: 'GETTING STARTED',
    content: `
Welcome to the VHS Documentation System.

This interface allows you to navigate technical
documentation using VCR-style controls.

Use your lightgun to select options.
Press FF to advance, REW to go back.

WARNING: Some tapes may contain corrupted
sections. If you experience tracking issues,
adjust your VCR heads.
    `,
    links: [
      { label: 'CONTINUE', href: '/docs/installation' },
    ],
  },
  'installation': {
    id: 'installation',
    title: 'INSTALLATION',
    content: `
Insert the documentation tape into your VCR.

Ensure the VCR is powered on and connected
to your display device.

Press PLAY to begin the documentation.

If the tape fails to load, try:
- Cleaning the VCR heads
- Checking the tape for damage
- Adjusting the tracking control
    `,
  },
};
