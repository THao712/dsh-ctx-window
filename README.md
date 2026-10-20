# Context Window for DeepSeek Harness

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness%20%3E%3D%200.2.1--rc.2-informational)

A DeepSeek Harness bundle that adds a compact context-window selector to the chat
composer for models served by **Qoder** and **Trae** reverse-proxy gateways.

The selected value is written to the model's own `contextWindow` in the provider
catalog through Harness's published settings API. It is therefore the value the
runtime actually uses to price a request, to render the context meter, and to
decide when compaction starts — not a label or a cached annotation.

---

## Overview

Harness derives a conversation's token budget exclusively from the adapter
metadata of the selected model. There is no session-level override, so the only
supported lever is the provider catalog entry itself.

This bundle exposes that lever as a one-click control, restricted to the gateways
whose upstream service genuinely honours a configurable window, and restricted to
the windows each model actually publishes.

## How it works

The bundle registers a single entry in the `conversation.input.right` slot. On
selection it performs one `settings/mutate` call:

```text
llm-pi-ai → providers.<provider>.models[<index>].contextWindow = <tokens>
```

This is the same write the Models settings page performs, so it needs no
elevated access and leaves no side channel. Harness then derives, from that
catalog entry:

- `request/context.contextWindow`, the value recorded for every request;
- the denominator of the context-usage meter;
- the compaction threshold of `dsh-compaction-basic`.

No monkey-patching, no DOM injection, no `localStorage`, no credential access.

## Supported gateways

Only gateways whose upstream honours a configurable window are covered.
**WorkBuddy is deliberately excluded**: its service does not accept a selectable
window, so offering the control there would promise something it cannot deliver.

A gateway is identified by provider id first (`qoder-intl-proxy`,
`qoder-cn-proxy`, `trae-proxy`), then by a loopback `baseURL` on the matching
port (8790, 8000). Renamed providers therefore still match, and a remote provider
never does.

### Qoder

Qoder publishes a per-model set of legal windows. The menu lists only those
values; a model with a single published window is shown as a fixed chip.

| Models | 国内版 (cn) | 国际版 (intl) |
|---|---|---|
| `Auto` | 200K (fixed) | 200K (fixed) |
| `Qwen3.8-Max`, `Qwen3.8-Flash`, `Qwen3.7-Max`, `Qwen3.7-Plus`, `Qwen3.7-Flash` | 200K / 400K / 1M | 200K / 400K / 1M |
| `DeepSeek-V4-Pro`, `DeepSeek-Flash` | 200K / 400K / 1M | 200K / 400K / 1M |
| `GLM-5.3`, `GLM-5.3-Flash`, `GLM-5.2` | 200K / 400K / 1M | 200K / 400K / 1M |
| `Kimi-K3`, `Kimi-K2.8-Preview` | 200K / 400K / 1M | 200K / 400K / 1M |
| MiniMax | 200K (fixed) | 200K / 400K / 1M |
| `Ultimate`, `Sonus`, `Cantus` | — | 200K / 400K / 1M |
| `Performance` | — | 272K / 400K / 1M |
| `Efficient` | — | 200K (fixed) |

### Trae

Trae exposes exactly two windows per model, read from the relay's own account
catalog (`context_window_tokens.dev` and `.max`): a standard window and an
optional 1M profile.

| Models | Standard | 1M profile |
|---|---|---|
| `deepseek-v4.1-flash`, `DeepSeek-V4-Flash-Official`, `DeepSeek-V4-Pro-Official`, `glm-5.2`, `glm-5.3`, `glm-5.3-flash`, `glm-5.3-flashx`, `kimi-k3`, `minimax-m3`, `minimax-m3.1-flash`, `qwen3.8-max`, `qwen-3.7-plus`, `step-5-preview` | 200K | 1M |
| `mimo-v2.6-flash`, `mimo-v2.6-pro` | 200K | 981,504 |
| `Doubao-Seed-2.1-Pro`, `Doubao-Seed-Evolving` | 256K | 1M |
| `Doubao-Seed-2.1-Turbo`, `Doubao-Seed-Code` | 256K | — (fixed) |
| `kimi-k2.6`, `kimi-k2.7-code` | 200K | — (fixed) |

The 1M profile is a capability of the relay, not of this bundle: if the relay's
own Max-mode switch is turned off, requests made at 1M fall back or fail. Select
the standard window in that case.

## Installation

The bundle is an ordinary Harness plugin package: `package.json` declares
`dsh.bundle.patch` and `dsh.client`, and `cordis.patch.yml` inserts the plugin
row.

```text
plugin_manager.install_bundle  github:THao712/dsh-ctx-window
```

A local checkout is installed the same way, by passing its directory instead of
the GitHub specification.

Requirements:

- DeepSeek Harness 0.2.1-rc.2 or newer;
- an `llm-pi-ai` provider row containing at least one supported gateway;
- one page refresh after the first installation, because client modules are
  loaded at boot.

## Usage

1. Select a model from a supported gateway.
2. Open the **Context** control beside the composer's submit button.
3. Choose a window. The menu shows the catalog baseline, the window used by the
   previous request, and a warning when the chosen value exceeds the baseline.

Every model also offers **Auto (model default)**, which restores the value
captured before this bundle wrote anything, and a validated custom integer
(`1 … 4,000,000`) for windows a gateway accepts but does not publish.

The value takes effect on the **next** request; the current request keeps the
window it was prepared with. The menu reports both, so a write that has not yet
been used is visible rather than implied.

## Verification

Verified against a live instance:

- Selection on `qoder-cn-proxy` → `DeepSeek-Flash` wrote
  `contextWindow: 400000` into the profile catalog, leaving every other model of
  that provider unchanged.
- The next request recorded
  `{provider: "qoder-cn-proxy", model: "DeepSeek-Flash", contextWindow: 400000}`
  in `request/context`, and the gateway served it.
- `trae-proxy` → `deepseek-v4.1-flash` at `1,000,000` was recorded with
  `contextWindow: 1000000` on two consecutive requests, both answered.

## Design limits

A context window belongs to the **model**, not to the session. Harness exposes no
per-session override: `LlmCallConfig` carries no window field, adapters are
exclusive per provider, and there is no resolution interceptor. This bundle
therefore changes the catalog entry for every session that uses that model, and
two sessions of the same model cannot hold different windows.

The selector constrains the menu to windows each model publishes; it does not
verify that the upstream will honour an arbitrary custom value. A request that
exceeds the real capacity of the service is rejected by that service.

## Known upstream behaviour

`trae-proxy` intermittently fails a step of a turn with
`Object of type set is not JSON serializable` (`PI_AI_ERROR`, all usage counters
zero). The failure was observed before this bundle existed, occurs at the first
or a later step of a turn independently of the configured window, and happens
before the request leaves the adapter. Retrying is the remedy; the relay is what
needs repair.

## Uninstall

Disable or remove the bundle. It holds no service, listener, or session state.
Values it has already written remain in the profile catalog and can be reverted
with **Auto** or in the Models settings page.

## Repository layout

| Path | Purpose |
|---|---|
| `index.js` | Host half. Declares no configuration; documented in-file. |
| `client.js` | Entire feature: slot registration, gateway detection, tier tables, selector. |
| `cordis.patch.yml` | Inserts the `ctx-window` plugin row. |
| `locale/*.json` | Plugin name and description for the settings page. |
| `icon.svg` | Original window glyph. |

## License

MIT. See [LICENSE](LICENSE).
