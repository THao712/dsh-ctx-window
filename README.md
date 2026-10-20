# Context Window (`@local/ctx-window`)

A compact **上下文 / Context** selector in the chat composer for the two local
reverse-proxy gateways whose upstream honours a configurable window (**Qoder**,
**Trae**). Picking a value rewrites that exact model's `contextWindow` in the
`llm-pi-ai` provider catalog through Harness's published `settings` Remote — the
same write the Models settings page performs — so the context budget, the context
meter, and the compaction threshold really use the chosen number.

## Install

The bundle is a normal Harness plugin package: `package.json` declares
`dsh.bundle.patch` and `dsh.client`, and `cordis.patch.yml` inserts the row.

```text
plugin_manager.install_bundle  github:THao712/dsh-ctx-window
```

A local checkout works the same way — pass its directory instead of the GitHub
spec. Requires DeepSeek Harness 0.2.1-rc.2 or newer, a `llm-pi-ai` provider row
with `qoder-intl-proxy` / `qoder-cn-proxy` / `trae-proxy` entries, and a page
refresh after the first install (the client module only loads on boot).

## Where it shows up

`conversation.input.right` (compact controls just before the composer submit
button), hidden unless the session's current model belongs to a gateway:

| Gateway | Providers | Local port | Suggested |
|---|---|---|---|
| Qoder | `qoder-intl-proxy`, `qoder-cn-proxy` | 8790 | 400K |
| Trae | `trae-proxy` | 8000 | 1M |

WorkBuddy (`wb-intl-proxy`, `wb-cn-proxy`, port 8788) is deliberately **not**
covered: its upstream does not honour a selectable window, so showing a control
there would promise something it cannot deliver.

Identification is by provider id, then by a loopback `baseURL` on that port, so a
renamed provider still matches and a remote provider never does. It never reads,
logs, or displays a credential.

## What a choice does

`设置 → providers.<id>.models[<i>].contextWindow` for the exact model.
Because Harness derives `request/context.contextWindow`, the context-usage
percentage, and `dsh-compaction-basic`'s threshold from that adapter metadata, the
next request runs with the new budget.

Qoder publishes a **per-model** set of legal windows, so the menu lists only the
tiers that model actually supports (unknown Qoder models fall back to
`200K / 400K / 1M`):

| Model | 国内版 | 国际版 |
|---|---|---|
| Auto | 200K (fixed) | 200K (fixed) |
| Qwen3.8-Max / 3.8-Flash / 3.7-Max / 3.7-Plus / 3.7-Flash | 1M / 200K / 400K | 1M / 200K / 400K |
| DeepSeek-V4-Pro / DeepSeek-Flash | 1M / 200K / 400K | 1M / 200K / 400K |
| GLM-5.3 / GLM-5.3-Flash / GLM-5.2 | 1M / 200K / 400K | 1M / 200K / 400K |
| Kimi-K3 / Kimi-K2.8-Preview | 1M / 200K / 400K | 1M / 200K / 400K |
| MiniMax | 200K (fixed) | 1M / 200K / 400K |
| Ultimate / Sonus / Cantus | — | 1M / 200K / 400K |
| Performance | — | 272K / 1M / 400K |
| Efficient | — | 200K (fixed) |

A fixed-window model keeps a **disabled** chip showing its window: there is
nothing to choose, and the tooltip says so. Every entry also offers
**自动（模型默认）** (restores the catalog value captured before this plugin wrote
anything) and a validated custom positive integer (`1 … 4,000,000`), so a value
outside the published tiers is still reachable when a gateway accepts one.

Trae exposes exactly **two** windows per model, taken from the relay's own
account catalog (`context_window_tokens.dev` / `.max`) — the standard window and
the optional 1M profile:

| Model | Standard | 1M profile |
|---|---|---|
| deepseek-v4.1-flash, DeepSeek-V4-{Flash,Pro}-Official, glm-5.2/5.3/5.3-flash/5.3-flashx, kimi-k3, minimax-m3 / m3.1-flash, qwen3.8-max, qwen-3.7-plus, step-5-preview | 200K | 1M |
| mimo-v2.6-flash, mimo-v2.6-pro | 200K | 981,504 |
| Doubao-Seed-2.1-Pro, Doubao-Seed-Evolving | 256K | 1M |
| Doubao-Seed-2.1-Turbo, Doubao-Seed-Code | 256K | — (fixed) |
| kimi-k2.6, kimi-k2.7-code | 200K | — (fixed) |

So the selector for Trae offers `200K / 1M` (or `256K / 1M`), and the four models
without a 1M profile get a fixed chip instead of a misleading 1M option.

## Verified end to end

1. Selector wrote through `settings` → `cordis.patch.yml` now carries
   `qoder-cn-proxy` → `DeepSeek-Flash` → `contextWindow: 400000` (the other models
   of that provider kept their original 180000/200000/96000).
2. The very next request was priced with it: the session log's
   `request/context` event records
   `{provider: "qoder-cn-proxy", model: "DeepSeek-Flash", contextWindow: 400000}`
   (the previous turn, on `deepseek-account/deepseek-flash`, recorded 1048576).
3. The gateway served that request, so the Qoder 国内版 endpoint really accepts a
   400K window.
4. The same check passed for Trae: after `trae-proxy` → `deepseek-v4.1-flash` was
   set to `1,000,000`, two consecutive `request/context` events recorded
   `contextWindow: 1000000` and the model answered both times.

### Known upstream flakiness (not this bundle)

`trae-proxy` intermittently fails a step of a turn with
`Object of type set is not JSON serializable` (`PI_AI_ERROR`, `usage` all zeros).
It was already recorded on 2026-10-19, before this bundle existed, and it hits the
first or a later step of a turn regardless of the configured window; when it
happens the request never leaves the adapter, so retrying is the fix and the
provider side is what needs repairing.

## Deliberate limitation

A context window is **per model, not per session** in Harness 0.2.1-rc.2: the
value lives in the adapter's model metadata, which carries no session identity.
This bundle therefore changes the model's catalog entry for every session that
uses that model; it cannot keep two sessions of the same model on different
windows. See the delivery report for the verified call path.

The window is a token budget, not a promise about upstream capacity: raising a
model above what its gateway really serves makes that gateway reject the request,
and the menu says so before you apply it.

## Uninstall

Disable or remove the bundle; the plugin holds no service, listener, or session
state. Model values it already wrote stay in `cordis.patch.yml`; set them back
with **自动** or in Settings → Models.
