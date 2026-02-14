import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || process.env.REPOSITORY_NAME || 'tasks';
const site = process.env.DOCS_SITE_URL || 'https://xertrov.github.io';
const base = process.env.DOCS_BASE_PATH || `/${repo}`;

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: 'The Backlogs',
      description: 'Liminal docs for backlog operations.',
      customCss: ['./src/styles/global.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/XertroV/tasks' }
      ],
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Install', link: '/getting-started/install' },
            { label: 'Quickstart', link: '/getting-started/quickstart' }
          ]
        },
        {
          label: 'Workflows',
          items: [
            { label: 'Daily Loop', link: '/workflows/daily-loop' },
            { label: 'Multi-Agent', link: '/workflows/multi-agent' },
            { label: 'Health Checks', link: '/workflows/health-checks' }
          ]
        },
        {
          label: 'Operations',
          autogenerate: { directory: 'operations' }
        },
        {
          label: 'Schema & Data',
          items: [
            { label: 'Schema', link: '/schema-and-data/schema' },
            { label: 'Data Export', link: '/schema-and-data/data-export' }
          ]
        },
        {
          label: 'Parity',
          items: [
            { label: 'TypeScript Parity', link: '/parity/typescript-parity' },
            { label: 'Command Differences', link: '/parity/command-differences' }
          ]
        },
        {
          label: 'Agent Usage',
          items: [
            { label: 'Agent Workflows', link: '/agent-usage/agent-workflows' }
          ]
        },
        {
          label: 'FAQ',
          items: [
            { label: 'Common Questions', link: '/faq/common-questions' }
          ]
        }
      ],
      components: {
        Head: './src/components/Head.astro'
      }
    })
  ]
});
