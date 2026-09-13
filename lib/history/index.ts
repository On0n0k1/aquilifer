// Namespaced re-exports of every history bucket — mainly for the options UI
// (SPEC §7), which needs to enumerate and render all of them. Code that
// only cares about one bucket (e.g. background.ts's chat handler) should
// import that module directly instead (e.g. `lib/history/generic`).

export * as generic from './generic';
export * as anthropicMessages from './anthropic-messages';
export * as openaiChatCompletions from './openai-chat-completions';
