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
            { text: 'Overview', link: '/docs/' },
            { text: 'Installing', link: '/docs/installing' },
          ],
        },
        {
          text: 'Using Aquilifer',
          items: [
            { text: 'Connecting a site', link: '/docs/connecting' },
            { text: 'Providers', link: '/docs/providers' },
            { text: 'The toolbar popup', link: '/docs/popup' },
            { text: 'Rate limiting', link: '/docs/rate-limiting' },
            { text: 'History', link: '/docs/history' },
            { text: 'The vault', link: '/docs/vault' },
          ],
        },
        {
          text: 'For developers',
          items: [{ text: 'The page-facing API', link: '/docs/api' }],
        },
        {
          text: 'Honesty',
          items: [
            { text: 'Limitations & downsides', link: '/docs/limitations' },
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
