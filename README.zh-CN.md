# DeepSeek Harness 上下文窗口选择器

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness%20%3E%3D%200.2.1--rc.2-informational)

一个 DeepSeek Harness 插件包，为 **Qoder** 与 **Trae** 反代网关提供的模型在输入框旁增加上下文窗口选择器。

选定值通过 Harness 公开的设置接口，写入该模型在供应商目录中的 `contextWindow`。因此它就是运行时实际用于请求计价、上下文用量显示与压缩触发的那个值，而非标签或缓存注解。

---

## 概述

Harness 的会话 token 预算只来自所选模型的适配器元数据，不存在会话级覆盖，因此唯一受支持的调节点就是供应商目录条目本身。

本插件把这个调节点做成一次点击即可完成的控件，并且仅对真正支持可配置窗口的网关开放，菜单也只列出各模型确实公布的窗口值。

## 实现方式

插件在 `conversation.input.right` 插槽注册一个条目；用户选择时执行一次 `settings/mutate` 调用：

```text
llm-pi-ai → providers.<provider>.models[<index>].contextWindow = <tokens>
```

这与「设置 → 模型」页面所做的写入完全一致，不需要额外权限，也不产生旁路。随后 Harness 会依据该目录条目推导：

- 每次请求记录的 `request/context.contextWindow`；
- 上下文用量指示器的分母；
- `dsh-compaction-basic` 的压缩阈值。

不使用猴补丁、不注入 DOM、不写 `localStorage`、不读取任何凭据。

## 支持的网关

仅覆盖上游确实支持可配置窗口的网关。**WorkBuddy 被有意排除**：其服务不接受可选窗口，在此提供控件等于承诺无法兑现的能力。

网关识别优先按 provider id（`qoder-intl-proxy`、`qoder-cn-proxy`、`trae-proxy`），其次按匹配端口的回环 `baseURL`（8790、8000）。因此改名后的供应商仍可命中，远端供应商永不命中。

### Qoder

Qoder 为每个模型公布一组合法窗口。菜单只列出这些值；仅有单一窗口的模型显示为固定档位。

| 模型 | 国内版 | 国际版 |
|---|---|---|
| `Auto` | 200K（固定） | 200K（固定） |
| `Qwen3.8-Max`、`Qwen3.8-Flash`、`Qwen3.7-Max`、`Qwen3.7-Plus`、`Qwen3.7-Flash` | 200K / 400K / 1M | 200K / 400K / 1M |
| `DeepSeek-V4-Pro`、`DeepSeek-Flash` | 200K / 400K / 1M | 200K / 400K / 1M |
| `GLM-5.3`、`GLM-5.3-Flash`、`GLM-5.2` | 200K / 400K / 1M | 200K / 400K / 1M |
| `Kimi-K3`、`Kimi-K2.8-Preview` | 200K / 400K / 1M | 200K / 400K / 1M |
| MiniMax | 200K（固定） | 200K / 400K / 1M |
| `Ultimate`、`Sonus`、`Cantus` | — | 200K / 400K / 1M |
| `Performance` | — | 272K / 400K / 1M |
| `Efficient` | — | 200K（固定） |

### Trae

Trae 每个模型只有两个窗口，取自反代自身的账号目录（`context_window_tokens.dev` 与 `.max`）：标准窗口与可选的 1M 档。

| 模型 | 标准 | 1M 档 |
|---|---|---|
| `deepseek-v4.1-flash`、`DeepSeek-V4-Flash-Official`、`DeepSeek-V4-Pro-Official`、`glm-5.2`、`glm-5.3`、`glm-5.3-flash`、`glm-5.3-flashx`、`kimi-k3`、`minimax-m3`、`minimax-m3.1-flash`、`qwen3.8-max`、`qwen-3.7-plus`、`step-5-preview` | 200K | 1M |
| `mimo-v2.6-flash`、`mimo-v2.6-pro` | 200K | 981,504 |
| `Doubao-Seed-2.1-Pro`、`Doubao-Seed-Evolving` | 256K | 1M |
| `Doubao-Seed-2.1-Turbo`、`Doubao-Seed-Code` | 256K | —（固定） |
| `kimi-k2.6`、`kimi-k2.7-code` | 200K | —（固定） |

1M 档属于反代的能力，而非本插件：若反代自身的 Max 模式开关被关闭，以 1M 发出的请求会回退或失败，此时请选择标准窗口。

## 网关实现

本插件只修改目录中的窗口值，既不实现也不代理任何上游。它面向的两个网关是独立项目：

| 网关 | 实现 |
|---|---|
| Qoder | [`shuishuipingan/qoder2api-hub`](https://github.com/shuishuipingan/qoder2api-hub) |
| Trae | [`autumnsentiment/Trae2api-cn`](https://github.com/autumnsentiment/Trae2api-cn) |

需要先部署其中一个，并作为 `llm-pi-ai` 供应商接入，本插件才有可操作的对象。上文列出的按模型窗口取自各网关自身公布的数据——Qoder 的模型目录，以及 Trae 反代账号中的 `context_window_tokens`；若网关调整了窗口，需要同步更新这些表格，菜单才会与之一致。

## 安装

插件是普通的 Harness 插件包：`package.json` 声明 `dsh.bundle.patch` 与 `dsh.client`，`cordis.patch.yml` 插入对应插件行。

```text
plugin_manager.install_bundle  github:THao712/dsh-ctx-window
```

本地检出目录的安装方式相同，把 GitHub 规格换成目录路径即可。

要求：

- DeepSeek Harness 0.2.1-rc.2 或更新版本；
- 存在 `llm-pi-ai` 供应商配置，且至少包含一个受支持的网关；
- 首次安装后刷新一次页面，因为客户端模块在页面启动时加载。

## 使用

1. 选择一个受支持网关的模型；
2. 打开输入框发送按钮旁的 **上下文** 控件；
3. 选择窗口。菜单同时显示目录原始值、上一次请求实际使用的窗口，并在所选值高于原始值时给出提示。

每个模型还提供 **自动（模型默认）**，用于恢复本插件写入之前采集的值；以及经过校验的自定义整数（`1 … 4,000,000`），供网关实际接受但未公布窗口时使用。

所选值在**下一次**请求生效，当前请求仍使用准备阶段的窗口。菜单会同时呈现两者，因此尚未生效的写入是可见的，而不是被暗示。

## 验证

已在真实实例上验证：

- 在 `qoder-cn-proxy` → `DeepSeek-Flash` 上选择后，profile 目录写入 `contextWindow: 400000`，该供应商其余模型保持不变；
- 随后一次请求在 `request/context` 中记录 `{provider: "qoder-cn-proxy", model: "DeepSeek-Flash", contextWindow: 400000}`，网关正常返回；
- `trae-proxy` → `deepseek-v4.1-flash` 设为 `1,000,000` 后，连续两次请求均记录 `contextWindow: 1000000`，且均正常返回。

## 设计限制

上下文窗口属于**模型**而非会话。Harness 不提供会话级覆盖：`LlmCallConfig` 没有窗口字段，适配器按供应商独占，也不存在解析拦截点。因此本插件修改的是该模型在所有会话中共用的目录条目，同一模型的两个会话无法各自持有不同窗口。

选择器只把菜单约束到各模型公布的窗口，并不校验上游是否接受任意自定义值。超出服务真实容量的请求会被该服务拒绝。

## 已知的上游问题

`trae-proxy` 偶发在一轮对话的某一步失败，报错为 `Object of type set is not JSON serializable`（`PI_AI_ERROR`，各项用量计数均为 0）。该故障在本插件存在之前即已出现，可能发生在一轮的首步或后续步骤，与配置的窗口无关，且发生在请求离开适配器之前。重试即可恢复，需要修复的是反代本身。

## 卸载

禁用或移除插件即可。它不持有服务、监听器或会话状态。已写入的窗口值仍保留在 profile 目录中，可用 **自动** 或「设置 → 模型」页面改回。

## 仓库结构

| 路径 | 用途 |
|---|---|
| `index.js` | Host 侧。不声明任何配置，理由见文件内注释。 |
| `client.js` | 全部功能：插槽注册、网关识别、档位表、选择器。 |
| `cordis.patch.yml` | 插入 `ctx-window` 插件行。 |
| `locale/*.json` | 设置页显示的插件名称与描述。 |
| `icon.svg` | 原创窗口图标。 |

## 许可

MIT，见 [LICENSE](LICENSE)。
