import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Aquilifer',
  description:
    'A browser extension that acts as a secure LLM provider for websites.',
  // Served at on0n0k1.github.io/aquilifer/ (SPEC §18) — VitePress's own
  // `base` is an absolute routing prefix, not a relative asset path, so
  // this is set to the real subpath rather than a relative './' (which
  // is the right call for a generic bundler, but breaks VitePress's own
  // client-side route generation).
  base: '/aquilifer/',
  cleanUrls: true,
  // Aquilifer's brand palette (theme/custom.css) is a fixed dark-green
  // identity, not a light/dark-mode-following neutral — same reasoning as
  // the extension's own CSS. force-dark drops the toggle entirely rather
  // than leaving a switcher that would just flip between two identical-
  // looking states.
  appearance: 'force-dark',

  themeConfig: {
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
                  text: 'Asking for a completion',
                  link: '/docs/api#asking-for-a-completion',
                },
                {
                  text: 'Provider-specific interfaces',
                  link: '/docs/api#provider-specific-interfaces',
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
              text: 'aquilifer-types',
              link: '/docs/aquilifer-types',
              collapsed: true,
              items: [
                {
                  text: 'Not published yet',
                  link: '/docs/aquilifer-types#not-published-yet',
                },
                {
                  text: 'What it will ship',
                  link: '/docs/aquilifer-types#what-it-will-ship',
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
