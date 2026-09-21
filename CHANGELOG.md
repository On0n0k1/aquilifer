## [1.6.1](https://github.com/On0n0k1/aquilifer/compare/v1.6.0...v1.6.1) (2026-09-21)


### Bug Fixes

* **docs:** add docs/tsconfig.json to fix the deploy build ([4257ef8](https://github.com/On0n0k1/aquilifer/commit/4257ef810f205522b4d494f458f63a9bb7cd6685))

# [1.6.0](https://github.com/On0n0k1/aquilifer/compare/v1.5.0...v1.6.0) (2026-09-21)


### Features

* **unlock:** apply the shared color theme to the vault unlock popup ([527073f](https://github.com/On0n0k1/aquilifer/commit/527073f4fc07d3bf0b67e263643e21f2127a2021))

# [1.5.0](https://github.com/On0n0k1/aquilifer/compare/v1.4.0...v1.5.0) (2026-09-20)


### Bug Fixes

* **options:** drop popup height setting, preview two fake providers ([ec8e8c8](https://github.com/On0n0k1/aquilifer/commit/ec8e8c89d117e5fb5f428ea6dfc626f98fb14317))


### Features

* **options:** add an Appearance tab for font size and popup width ([460e0d0](https://github.com/On0n0k1/aquilifer/commit/460e0d09f613271596ca87332d3357030c1ccea5))
* **options:** live-preview font size and use a slider for it ([b6d96a7](https://github.com/On0n0k1/aquilifer/commit/b6d96a7b3f7dd1ae4a851c2ba3827d293a9ce9a0))
* **options:** round out the popup preview's fake state ([4f04d91](https://github.com/On0n0k1/aquilifer/commit/4f04d91170b31a79c6ecfcfc194cd9fa0dfc853d))

# [1.4.0](https://github.com/On0n0k1/aquilifer/compare/v1.3.0...v1.4.0) (2026-09-20)


### Bug Fixes

* **background:** cool down repeated rate-limit block alerts ([1e2b4ce](https://github.com/On0n0k1/aquilifer/commit/1e2b4ce127f1136527d85d452eb2215032831dd4))
* **popup:** match the Default tag and Set Default button's box size ([2f92425](https://github.com/On0n0k1/aquilifer/commit/2f924251041399d53764fdb785a9264d4a556cd4))
* **popup:** pin the status row's height instead of resizing the badges ([54633c5](https://github.com/On0n0k1/aquilifer/commit/54633c5e730525ffd8ffdc2ddc694ced95564dd6))
* **popup:** reliably close the picker on re-picking the same model ([15f75c2](https://github.com/On0n0k1/aquilifer/commit/15f75c2b1f1cb8ecb5df18c31adf510afa72795c))


### Features

* **options:** make the block-alert cooldown configurable ([89b5417](https://github.com/On0n0k1/aquilifer/commit/89b541722d5d0afa52078196cd08ef1d085277ef))

# [1.3.0](https://github.com/On0n0k1/aquilifer/compare/v1.2.0...v1.3.0) (2026-09-20)


### Bug Fixes

* **options:** separate History's prompt from its response ([286d1ee](https://github.com/On0n0k1/aquilifer/commit/286d1eed1c41c89da69c7273400eb6e2eed9ef68))
* **options:** use one fixed width across every tab, not just History ([7a53eb3](https://github.com/On0n0k1/aquilifer/commit/7a53eb342f4c5005234cab1cdaf39c5961a4ffd4))
* **popup:** rename 'Manage providers' button to 'Settings' ([a91b3f7](https://github.com/On0n0k1/aquilifer/commit/a91b3f7a7a827a27f49b8bd2a82ae0ae431514e9))


### Features

* **docs:** apply the Aquilifer color palette to the docs site ([c1e1f72](https://github.com/On0n0k1/aquilifer/commit/c1e1f7206bfa3b998ad8115711a554d5f27e7c49))
* **options:** add a Dark/Light toggle for History entry cards ([7d36573](https://github.com/On0n0k1/aquilifer/commit/7d36573002f54c91865e9a563b8e5a65e21493e6))
* **options:** add hover tooltips to the block-notification checkboxes ([bb961d0](https://github.com/On0n0k1/aquilifer/commit/bb961d03b45eb957541311204d9e88239614c05c))
* **options:** render generic-chat history as markdown, widen the tab ([44b252e](https://github.com/On0n0k1/aquilifer/commit/44b252e33a0ab423a42023e09a47a890705dba91))

# [1.2.0](https://github.com/On0n0k1/aquilifer/compare/v1.1.1...v1.2.0) (2026-09-19)


### Bug Fixes

* **popup:** add Set default, and let the model picker be cancelled ([403f7e1](https://github.com/On0n0k1/aquilifer/commit/403f7e1391311af55842c5bdb8aa0b2b9bf48a87))
* re-render icons with working alpha transparency ([a2e94e1](https://github.com/On0n0k1/aquilifer/commit/a2e94e1847fe25dca39021dc972832aeb32b2368))


### Features

* **approve:** apply the Aquilifer color palette ([852adde](https://github.com/On0n0k1/aquilifer/commit/852adde0ea6eb4fddb3a48d06a5e7395e57df255))
* **background:** track in-flight requests and share rate-limit status logic ([6336491](https://github.com/On0n0k1/aquilifer/commit/6336491331267c88d552325f5e9fcf10e97d7155))
* **options:** apply the Aquilifer color palette ([5886c35](https://github.com/On0n0k1/aquilifer/commit/5886c355b501375cfbe52c142af4d12aebf06fed))
* **options:** auto-discover the model when adding a provider ([2ef0ae2](https://github.com/On0n0k1/aquilifer/commit/2ef0ae2307cb77f9f705d9d6df5c6d0452c1a516))
* **popup:** add a per-provider model switcher ([746639b](https://github.com/On0n0k1/aquilifer/commit/746639bddcc3bda3e629333e24e3b288964bcdcc))
* **popup:** apply the Aquilifer color palette ([73aebf0](https://github.com/On0n0k1/aquilifer/commit/73aebf0fcc0f4e70141d0808dfeba3fb38dd0eb7))
* **popup:** replace the WXT scaffold with real Aquilifer content ([cc7e267](https://github.com/On0n0k1/aquilifer/commit/cc7e267ed9f7463283c6127de69a4ddc6c758914))
* **popup:** right-align action buttons, add site disconnect ([439f1b7](https://github.com/On0n0k1/aquilifer/commit/439f1b730e1ca6325ce4542ae963d3841f66ed70))
* **providers:** add model-listing clients for Anthropic and OpenAI-compatible ([6de7c13](https://github.com/On0n0k1/aquilifer/commit/6de7c13a133f5be55d8e5e01340860bfb1fd570c))

## [1.1.1](https://github.com/On0n0k1/aquilifer/compare/v1.1.0...v1.1.1) (2026-09-18)


### Bug Fixes

* stop deploy-pages workflow failing on every push ([35821d8](https://github.com/On0n0k1/aquilifer/commit/35821d86935ba214e5ca3716817ee0a6c8ed34c4))

# [1.1.0](https://github.com/On0n0k1/aquilifer/compare/v1.0.0...v1.1.0) (2026-09-18)


### Features

* add an opt-in encrypted vault for provider API keys ([873e848](https://github.com/On0n0k1/aquilifer/commit/873e8484da1c957a62c7fffe04eb5b3b1a8fa588))
* add storage schema migrations ([cad92d8](https://github.com/On0n0k1/aquilifer/commit/cad92d8494a2b786de19b978e91d44f4c62daa7f))
* replace placeholder icon and popup logo with Aquilifer artwork ([76d1a60](https://github.com/On0n0k1/aquilifer/commit/76d1a608ab787cfea265bc44fc6769b246f99787))

# 1.0.0 (2026-09-16)


### Bug Fixes

* use a clearer placeholder for the provider label field ([88bc03c](https://github.com/On0n0k1/aquilifer-ext/commit/88bc03c00e3600fc064ed179eab3a3ca83d89f5c))


### Features

* add configurable per-origin rate limiting with blocking, notifications, and a popup alert ([72b0463](https://github.com/On0n0k1/aquilifer-ext/commit/72b0463dd0cc402f940e50ca063f5a111ce9b03e))
* add connect approval popup with persisted per-origin grants ([3cd37ea](https://github.com/On0n0k1/aquilifer-ext/commit/3cd37ea8e5b2fa1ce4502ee8564e63563913a8d7))
* add connected-sites management UI with live revocation ([2ed0c65](https://github.com/On0n0k1/aquilifer-ext/commit/2ed0c654923a82381ef63cc3ba245db204f2fe7e))
* add getProvider method for website-visible provider metadata ([e100f59](https://github.com/On0n0k1/aquilifer-ext/commit/e100f59f72a9bf6446dcc684a4a7cca53a0836cd))
* add page-facing connect/disconnect/permissionChanged events ([0b93f03](https://github.com/On0n0k1/aquilifer-ext/commit/0b93f033d6d9d164cc0b710e956180c81994a70c))
* add per-origin history audit log with options page viewer ([57b639d](https://github.com/On0n0k1/aquilifer-ext/commit/57b639d38e5ffb4204a3ed5f51c41652de4f215c))
* add provider settings page with per-host permission grants ([086cccc](https://github.com/On0n0k1/aquilifer-ext/commit/086cccc96502eb25c10e2aeeef06f19db4c6c3c6))
* add read-only isConnected() status check ([0c78052](https://github.com/On0n0k1/aquilifer-ext/commit/0c78052f82d4f514025c9c02e7fd26cf73a212d0))
* add streaming for provider-specific interfaces ([b0b1a25](https://github.com/On0n0k1/aquilifer-ext/commit/b0b1a25ed4403805627291ce9ba6403c1466ea56))
* add streaming support for the generic chat interface ([13ab91e](https://github.com/On0n0k1/aquilifer-ext/commit/13ab91e26bd9211d9a75b4c8fa1ceb066414f9f6))
* add typed pass-through core for provider-specific interfaces ([bec4f63](https://github.com/On0n0k1/aquilifer-ext/commit/bec4f636b97e897a94bb082c569ed365817a75d9))
* bind connect approval to a user-chosen provider ([6151aea](https://github.com/On0n0k1/aquilifer-ext/commit/6151aeab768f7d1107d86977513b8dda02a843cf))
* give every thrown error a stable code field ([916057c](https://github.com/On0n0k1/aquilifer-ext/commit/916057c83f6b33e3c7b5fac60d1437dc96ebbc6d))
* implement real chat requests to Anthropic and OpenAI-compatible providers ([fab868a](https://github.com/On0n0k1/aquilifer-ext/commit/fab868a05b6a714cc204dd5103a71c73aa40bcd4))
* implement two-tier global and per-interface rate limiting ([da2541b](https://github.com/On0n0k1/aquilifer-ext/commit/da2541bca809197e6b796d9c933352950e49befe))
* select Anthropic model by family and version ([2283bbf](https://github.com/On0n0k1/aquilifer-ext/commit/2283bbfd523603e961cf5ff10c8a63bd3d942d84))
* tab the options page and add per-interface history views ([9aaa117](https://github.com/On0n0k1/aquilifer-ext/commit/9aaa117be4e55d33879668c7883bff4580bcb15f))
* verify providers on save and resolve their reported model ([5df9873](https://github.com/On0n0k1/aquilifer-ext/commit/5df9873c29ecc6f9ff539d7b72e131a169623552))
* wire page-to-background relay with connect gate stub ([c13ed22](https://github.com/On0n0k1/aquilifer-ext/commit/c13ed223492e8d1168bf57571447520dc3e66bd8))
* wire provider-specific interfaces with switch-approval flow ([3fb61a6](https://github.com/On0n0k1/aquilifer-ext/commit/3fb61a697a66de41d4f2c5b03611ac696e8cdf7f))
