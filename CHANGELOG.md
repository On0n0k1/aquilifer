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
