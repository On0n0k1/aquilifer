import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Aquilifer',
  description:
    'A browser extension that acts as a secure LLM provider for websites.',
  // Served at on0n0k1.github.io/projects/aquilifer/ (SPEC §18) —
  // VitePress's own `base` is an absolute routing prefix, not a relative
  // asset path, so this is set to the real subpath rather than a relative
  // './' (which is the right call for a generic bundler, but breaks
  // VitePress's own client-side route generation).
  base: '/projects/aquilifer/',
  cleanUrls: true,
  // Git-based, per-page "Last updated" footer on every docs page — computed
  // from that file's own commit history, not a hand-written date that goes
  // stale the moment the page changes and nobody remembers to bump it.
  // Needs full git history to compute correctly (see the deploy job's
  // checkout step, which sets fetch-depth: 0 for exactly this).
  lastUpdated: true,
  // Same icon renders as the extension's own manifest icons
  // (public/icon/ at the repo root) — copied into docs/public/icon/
  // rather than referenced across package boundaries, since this is a
  // separate VitePress project with its own public dir. `head` entries
  // are injected as raw HTML, not resolved through VitePress's router,
  // so the base prefix has to be spelled out by hand here (unlike
  // frontmatter/markdown asset references, which get it automatically).
  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/projects/aquilifer/icon/32.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/projects/aquilifer/icon/16.png',
      },
    ],
  ],
  // Aquilifer's brand palette (theme/custom.css) is a fixed dark-green
  // identity, not a light/dark-mode-following neutral — same reasoning as
  // the extension's own CSS. force-dark drops the toggle entirely rather
  // than leaving a switcher that would just flip between two identical-
  // looking states.
  appearance: 'force-dark',

  themeConfig: {
    logo: '/icon/32.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/docs/' },
    ],

    sidebar: {
      '/docs/': [
        {
          text: 'Getting started',
          items: [
            {
              text: 'Overview',
              link: '/docs/',
              collapsed: true,
              items: [
                {
                  text: 'The three things that never change',
                  link: '/docs/#the-three-things-that-never-change',
                },
                {
                  text: "What's on this page vs. the rest of the docs",
                  link: '/docs/#what-s-on-this-page-vs-the-rest-of-the-docs',
                },
              ],
            },
            {
              text: 'Installing',
              link: '/docs/installing',
              collapsed: true,
              items: [
                { text: 'Requirements', link: '/docs/installing#requirements' },
                { text: 'Build it', link: '/docs/installing#build-it' },
                {
                  text: 'Load it into your browser',
                  link: '/docs/installing#load-it-into-your-browser',
                },
                {
                  text: 'Staying up to date',
                  link: '/docs/installing#staying-up-to-date',
                },
              ],
            },
          ],
        },
        {
          text: 'Using Aquilifer',
          items: [
            {
              text: 'Connecting a site',
              link: '/docs/connecting',
              collapsed: true,
              items: [
                {
                  text: 'Connect once, then silent',
                  link: '/docs/connecting#connect-once-then-silent',
                },
                {
                  text: 'Switching providers',
                  link: '/docs/connecting#switching-providers',
                },
                {
                  text: 'What if you close the popup without answering?',
                  link: '/docs/connecting#what-if-you-close-the-popup-without-answering',
                },
                {
                  text: 'Managing connected sites',
                  link: '/docs/connecting#managing-connected-sites',
                },
              ],
            },
            {
              text: 'Providers',
              link: '/docs/providers',
              collapsed: true,
              items: [
                {
                  text: 'Two kinds of provider',
                  link: '/docs/providers#two-kinds-of-provider',
                },
                {
                  text: 'Adding a provider',
                  link: '/docs/providers#adding-a-provider',
                },
                {
                  text: 'Default provider and switching',
                  link: '/docs/providers#default-provider-and-switching',
                },
                {
                  text: 'Removing a provider',
                  link: '/docs/providers#removing-a-provider',
                },
              ],
            },
            {
              text: 'The toolbar popup',
              link: '/docs/popup',
              collapsed: true,
              items: [
                { text: 'What it shows', link: '/docs/popup#what-it-shows' },
                {
                  text: 'Managing providers from here',
                  link: '/docs/popup#managing-providers-from-here',
                },
              ],
            },
            {
              text: 'Rate limiting',
              link: '/docs/rate-limiting',
              collapsed: true,
              items: [
                { text: 'Two tiers', link: '/docs/rate-limiting#two-tiers' },
                {
                  text: 'What happens when a request is blocked',
                  link: '/docs/rate-limiting#what-happens-when-a-request-is-blocked',
                },
                {
                  text: 'A note for large requests',
                  link: '/docs/rate-limiting#a-note-for-large-requests',
                },
                {
                  text: "A note if you're integrating Aquilifer as a fallback",
                  link: '/docs/rate-limiting#a-note-if-you-re-integrating-aquilifer-as-a-fallback',
                },
              ],
            },
            {
              text: 'History',
              link: '/docs/history',
              collapsed: true,
              items: [
                {
                  text: "It's audit-only, never replayed",
                  link: '/docs/history#it-s-audit-only-never-replayed',
                },
                {
                  text: 'Kept separately per interface',
                  link: '/docs/history#kept-separately-per-interface',
                },
                {
                  text: 'Dark or light entry cards',
                  link: '/docs/history#dark-or-light-entry-cards',
                },
                {
                  text: "What it doesn't do",
                  link: '/docs/history#what-it-doesn-t-do',
                },
              ],
            },
            {
              text: 'The vault',
              link: '/docs/vault',
              collapsed: true,
              items: [
                {
                  text: 'Read this before turning it on',
                  link: '/docs/vault#read-this-before-turning-it-on',
                },
                {
                  text: "Why you'd turn it on",
                  link: '/docs/vault#why-you-d-turn-it-on',
                },
                { text: 'Setting it up', link: '/docs/vault#setting-it-up' },
                {
                  text: 'Locking and unlocking',
                  link: '/docs/vault#locking-and-unlocking',
                },
                { text: 'Turning it off', link: '/docs/vault#turning-it-off' },
              ],
            },
            {
              text: 'Appearance',
              link: '/docs/appearance',
              collapsed: true,
              items: [
                { text: 'Font size', link: '/docs/appearance#font-size' },
                {
                  text: 'Popup width',
                  link: '/docs/appearance#popup-width',
                },
              ],
            },
          ],
        },
        {
          text: 'For developers',
          items: [
            {
              text: 'The page-facing API',
              link: '/docs/api',
              collapsed: true,
              items: [
                {
                  text: 'Before you start',
                  link: '/docs/api#before-you-start',
                },
                { text: 'Connecting', link: '/docs/api#connecting' },
                {
                  text: 'Which interface to use',
                  link: '/docs/api#which-interface-to-use',
                },
                {
                  text: 'Other things you can check',
                  link: '/docs/api#other-things-you-can-check',
                },
                { text: 'Events', link: '/docs/api#events' },
                { text: 'Error handling', link: '/docs/api#error-handling' },
                {
                  text: 'Using Aquilifer as a fallback',
                  link: '/docs/api#using-aquilifer-as-a-fallback',
                },
              ],
            },
            {
              text: 'Generic API',
              link: '/docs/generic-api',
              collapsed: true,
              items: [
                {
                  text: 'Asking for a completion',
                  link: '/docs/generic-api#asking-for-a-completion',
                },
                {
                  text: 'Streaming',
                  link: '/docs/generic-api#streaming',
                },
              ],
            },
            {
              text: 'Anthropic Claude',
              link: '/docs/anthropic-api',
              collapsed: true,
              items: [
                {
                  text: 'Sending a message',
                  link: '/docs/anthropic-api#sending-a-message',
                },
                {
                  text: 'Streaming',
                  link: '/docs/anthropic-api#streaming',
                },
                {
                  text: "If the user isn't bound to an Anthropic provider",
                  link: '/docs/anthropic-api#if-the-user-isn-t-bound-to-an-anthropic-provider',
                },
              ],
            },
            {
              text: 'OpenAI-compatible',
              link: '/docs/openai-compatible-api',
              collapsed: true,
              items: [
                {
                  text: 'Sending a message',
                  link: '/docs/openai-compatible-api#sending-a-message',
                },
                {
                  text: 'Streaming',
                  link: '/docs/openai-compatible-api#streaming',
                },
                {
                  text: "If the user isn't bound to an OpenAI-compatible provider",
                  link: '/docs/openai-compatible-api#if-the-user-isn-t-bound-to-an-openai-compatible-provider',
                },
              ],
            },
            {
              text: 'aquilifer-types',
              link: '/docs/aquilifer-types',
              collapsed: true,
              items: [
                {
                  text: 'Installing it',
                  link: '/docs/aquilifer-types#installing-it',
                },
                {
                  text: 'What it ships',
                  link: '/docs/aquilifer-types#what-it-ships',
                },
                {
                  text: "What it won't ship yet",
                  link: '/docs/aquilifer-types#what-it-won-t-ship-yet',
                },
                {
                  text: 'Package name status',
                  link: '/docs/aquilifer-types#package-name-status',
                },
              ],
            },
          ],
        },
        {
          text: 'Honesty',
          items: [
            {
              text: 'Limitations & downsides',
              link: '/docs/limitations',
              collapsed: true,
              items: [
                {
                  text: 'Security & storage',
                  link: '/docs/limitations#security-storage',
                },
                {
                  text: "What Aquilifer doesn't do",
                  link: '/docs/limitations#what-aquilifer-doesn-t-do',
                },
                {
                  text: 'Platform & maturity',
                  link: '/docs/limitations#platform-maturity',
                },
                {
                  text: 'Found something not listed here?',
                  link: '/docs/limitations#found-something-not-listed-here',
                },
              ],
            },
            {
              text: 'Privacy policy',
              link: '/docs/privacy',
              collapsed: true,
              items: [
                {
                  text: 'The short version',
                  link: '/docs/privacy#the-short-version',
                },
                {
                  text: 'What Aquilifer stores, and where',
                  link: '/docs/privacy#what-aquilifer-stores-and-where',
                },
                {
                  text: 'What Aquilifer sends over the network, and to whom',
                  link: '/docs/privacy#what-aquilifer-sends-over-the-network-and-to-whom',
                },
                {
                  text: 'No analytics, no tracking',
                  link: '/docs/privacy#no-analytics-no-tracking',
                },
                {
                  text: 'Your control over this data',
                  link: '/docs/privacy#your-control-over-this-data',
                },
                {
                  text: 'Permissions this extension requests',
                  link: '/docs/privacy#permissions-this-extension-requests',
                },
              ],
            },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/On0n0k1/aquilifer' },
    ],

    footer: {
      message: 'Released under the Apache License 2.0.',
    },
  },
});
