<script setup lang="ts">
// Same git-computed date VitePress's own default theme shows at the
// bottom of every page (docs/.vitepress/config.ts's lastUpdated: true) —
// this just renders it at the top instead, via the doc-before slot
// (theme/index.ts). The bottom copy is hidden via custom.css rather than
// disabled at the config level, since disabling it there would also drop
// the underlying computed date this component reads.
import { useData } from 'vitepress';
import { computed, onMounted, ref, watchEffect } from 'vue';

const { theme, page, lang } = useData();

// biome-ignore lint/correctness/noUnusedVariables: used in <template> below — biome's JS/TS analysis of a Vue SFC's <script> block can't see template usage.
const hasLastUpdated = computed(() => Boolean(page.value.lastUpdated));
const date = computed(() => new Date(page.value.lastUpdated as number));
// biome-ignore lint/correctness/noUnusedVariables: used in <template> below, same reason as hasLastUpdated above.
const isoDatetime = computed(() => date.value.toISOString());
const datetime = ref('');

// Set on mount, not as a plain computed, to avoid a hydration mismatch if
// the server and the visitor's browser are in different timezones (same
// reasoning as VitePress's own VPDocFooterLastUpdated).
onMounted(() => {
  watchEffect(() => {
    datetime.value = new Intl.DateTimeFormat(
      theme.value.lastUpdated?.formatOptions?.forceLocale
        ? lang.value
        : undefined,
      theme.value.lastUpdated?.formatOptions ?? {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    ).format(date.value);
  });
});
</script>

<template>
  <p v-if="hasLastUpdated" class="last-updated-top">
    {{ theme.lastUpdated?.text || theme.lastUpdatedText || 'Last updated' }}:
    <time :datetime="isoDatetime">{{ datetime }}</time>
  </p>
</template>

<style scoped>
.last-updated-top {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}
</style>
