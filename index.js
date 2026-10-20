/**
 * Host half of the context-window bundle.
 *
 * Harness derives the effective context budget from the LLM adapter's model
 * metadata (`request/context.contextWindow` and the compaction threshold), so
 * the whole feature is a model-catalog edit performed by the Client module
 * through the published `settings` Remote. This half only owns the inventory
 * row; it deliberately registers no service, event listener, or tool.
 */
export function apply() {}
