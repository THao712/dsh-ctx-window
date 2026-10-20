/**
 * Browser half of the context-window bundle.
 *
 * Harness prices a conversation from the LLM adapter's model metadata, so the
 * only published lever that really moves the budget is the provider catalog.
 * This module renders a compact selector beside the composer for the three
 * local reverse-proxy gateways and rewrites `contextWindow` on the exact
 * provider/model through the `settings` Remote, the same write the Models
 * settings page performs.
 */
window.__ModuleLoader__.load({
  id: '@local/ctx-window',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useRef, useState } = React

    const SLOT = 'conversation.input.right'
    const SETTINGS_NS = 'llm-pi-ai'
    const LOCALE_NS = 'ctx-window'
    const PRESETS = [128000, 180000, 200000, 256000, 400000, 1000000]
    const HARD_MAX = 4000000
    const MENU_WIDTH = 264

    /**
     * Catalog windows captured from the operator's profile before this plugin
     * ever wrote one. `Auto` restores these; a model added later is captured on
     * first sight and remembered for the rest of the page session.
     */
    const BASELINES = {
      "qoder-intl-proxy/Auto": 200000, "qoder-intl-proxy/Ultimate": 180000, "qoder-intl-proxy/Performance": 180000, "qoder-intl-proxy/Efficient": 180000,
      "qoder-intl-proxy/Sonus": 180000, "qoder-intl-proxy/Cantus": 180000, "qoder-intl-proxy/Qwen3.8-Max": 180000, "qoder-intl-proxy/Qwen3.8-Flash": 180000,
      "qoder-intl-proxy/Qwen3.7-Max": 180000, "qoder-intl-proxy/Qwen3.7-Plus": 180000, "qoder-intl-proxy/Kimi-K3": 180000, "qoder-intl-proxy/Kimi-K2.8-Preview": 180000,
      "qoder-intl-proxy/GLM-5.3": 180000, "qoder-intl-proxy/GLM-5.3-Flash": 1000000, "qoder-intl-proxy/DeepSeek-V4-Pro": 96000, "qoder-intl-proxy/DeepSeek-Flash": 180000,
      "qoder-intl-proxy/MiniMax-M3": 180000, "qoder-intl-proxy/MiniMax-M3.1-Flash": 180000, "qoder-cn-proxy/Auto": 200000, "qoder-cn-proxy/Qwen3.8-Max": 180000, "qoder-cn-proxy/Qwen3.8-Flash": 180000,
      "qoder-cn-proxy/Qwen3.7-Max": 180000, "qoder-cn-proxy/Qwen3.7-Plus": 180000, "qoder-cn-proxy/Qwen3.7-Flash": 180000, "qoder-cn-proxy/DeepSeek-V4-Pro": 96000,
      "qoder-cn-proxy/DeepSeek-Flash": 180000, "qoder-cn-proxy/GLM-5.3": 180000, "qoder-cn-proxy/GLM-5.3-Flash": 1000000, "qoder-cn-proxy/GLM-5.2": 180000,
      "qoder-cn-proxy/Kimi-K3": 180000, "qoder-cn-proxy/Kimi-K2.8-Preview": 180000, "qoder-cn-proxy/MiniMax-M2.7": 180000, "qoder-cn-proxy/MiniMax-M3.1-Flash": 180000, "trae-proxy/DeepSeek-V4-Flash-Official": 200000,
      "trae-proxy/DeepSeek-V4-Pro-Official": 200000, "trae-proxy/deepseek-v4.1-flash": 200000, "trae-proxy/Doubao-Seed-2.1-Pro": 256000, "trae-proxy/Doubao-Seed-2.1-Turbo": 256000,
      "trae-proxy/Doubao-Seed-Code": 256000, "trae-proxy/Doubao-Seed-Evolving": 256000, "trae-proxy/glm-5.2": 200000, "trae-proxy/glm-5.3": 200000,
      "trae-proxy/glm-5.3-flash": 200000, "trae-proxy/glm-5.3-flashx": 200000, "trae-proxy/kimi-k2.6": 200000, "trae-proxy/kimi-k2.7-code": 200000,
      "trae-proxy/kimi-k3": 200000, "trae-proxy/mimo-v2.6-flash": 200000, "trae-proxy/mimo-v2.6-pro": 200000, "trae-proxy/minimax-m3": 200000,
      "trae-proxy/qwen-3.7-plus": 200000, "trae-proxy/qwen3.8-max": 200000, "trae-proxy/step-5-preview": 200000,
    }

    /**
     * Only these two gateways expose a usable context window, so only they get a
     * selector. WorkBuddy is deliberately absent: its upstream ignores the value.
     */
    const GATEWAYS = [
      {
        id: 'qoder',
        name: 'Qoder',
        providers: ['qoder-intl-proxy', 'qoder-cn-proxy'],
        ports: [8790],
        recommended: 400000,
      },
      {
        id: 'trae',
        name: 'Trae',
        providers: ['trae-proxy'],
        ports: [8000],
        recommended: 1000000,
      },
    ]

    /**
     * Qoder publishes a per-model set of legal windows, and the sets differ.
     * A model with a single entry has a fixed window and gets no selector.
     * Unknown Qoder models fall back to the common 200K / 400K / 1M set.
     */
    const COMMON = [200000, 400000, 1000000]
    const QODER_TIERS = {
      'qoder-cn-proxy': {
        Auto: [200000],
        'Qwen3.8-Max': COMMON,
        'Qwen3.8-Flash': COMMON,
        'Qwen3.7-Max': COMMON,
        'Qwen3.7-Plus': COMMON,
        'Qwen3.7-Flash': COMMON,
        'DeepSeek-V4-Pro': COMMON,
        'DeepSeek-Flash': COMMON,
        'GLM-5.3': COMMON,
        'GLM-5.3-Flash': COMMON,
        'GLM-5.2': COMMON,
        'Kimi-K3': COMMON,
        'Kimi-K2.8-Preview': COMMON,
        'MiniMax-M2.7': [200000],
        'MiniMax-M3.1-Flash': [200000],
      },
      'qoder-intl-proxy': {
        Auto: [200000],
        Ultimate: COMMON,
        Performance: [272000, 400000, 1000000],
        Efficient: [200000],
        Sonus: COMMON,
        Cantus: COMMON,
        'Qwen3.8-Max': COMMON,
        'Qwen3.8-Flash': COMMON,
        'Qwen3.7-Max': COMMON,
        'Qwen3.7-Plus': COMMON,
        'Kimi-K3': COMMON,
        'Kimi-K2.8-Preview': COMMON,
        'GLM-5.3': COMMON,
        'GLM-5.3-Flash': COMMON,
        'DeepSeek-V4-Pro': COMMON,
        'DeepSeek-Flash': COMMON,
        'MiniMax-M3': COMMON,
        'MiniMax-M3.1-Flash': COMMON,
      },
    }

    /**
     * Trae exposes exactly two windows per model: the standard one
     * (`context_window_tokens.dev`, 200K, or 256K for the Seed family) and the
     * optional 1M "max" profile. Models whose account config reports no max
     * profile (`max = 0`) have a single fixed window.
     */
    const TRAE_STD = [200000, 1000000]
    const TRAE_SEED_2_1 = [256000, 1000000]
    const TRAE_TIERS = {
      'DeepSeek-V4-Flash-Official': TRAE_STD,
      'deepseek-v4-flash-official': TRAE_STD,
      'DeepSeek-V4-Pro-Official': TRAE_STD,
      'deepseek-v4-pro-official': TRAE_STD,
      'deepseek-v4.1-flash': TRAE_STD,
      'deepseek-v4-flash': TRAE_STD,
      'glm-5.2': TRAE_STD,
      'glm-5.3': TRAE_STD,
      'glm-5.3-flash': TRAE_STD,
      'glm-5.3-flashx': TRAE_STD,
      'kimi-k3': TRAE_STD,
      'minimax-m3': TRAE_STD,
      'minimax-m3.1-flash': TRAE_STD,
      'qwen-3.7-plus': TRAE_STD,
      'qwen3.8-max': TRAE_STD,
      'step-5-preview': TRAE_STD,
      'mimo-v2.6-flash': [200000, 981504],
      'mimo-v2.6-pro': [200000, 981504],
      'Doubao-Seed-2.1-Pro': TRAE_SEED_2_1,
      'Doubao-Seed-Evolving': TRAE_SEED_2_1,
      'Doubao-Seed-2.1-Turbo': [256000],
      'Doubao-Seed-Code': [256000],
      'kimi-k2.6': [200000],
      'kimi-k2.7-code': [200000],
    }
    const TRAE_FALLBACK_TIERS = TRAE_STD

    function tiersFor(provider, model) {
      const table = QODER_TIERS[provider]
      if (table !== undefined) {
        const tiers = table[model]
        return Array.isArray(tiers) && tiers.length > 0 ? tiers : COMMON
      }
      if (provider === 'trae-proxy') {
        const tiers = TRAE_TIERS[model]
        if (Array.isArray(tiers) && tiers.length > 0) return tiers
        return TRAE_FALLBACK_TIERS
      }
      return PRESETS
    }

    const DICTIONARIES = {
      zh: {
        label: '上下文',
        title: '上下文窗口',
        auto: '自动（模型默认）',
        autoUnknown: '自动（无原始值）',
        custom: '自定义…',
        customPlaceholder: '正整数 token',
        apply: '应用',
        catalog: '原始值',
        effective: '上次请求',
        recommended: '推荐',
        gateway: '{name} 网关',
        fixedTitle: '该模型档位固定为 {value}，无法调整',
        noteAbove: '高于原始值 {base}。若网关不接受该窗口，请求会被拒绝。',
        noteRestored: '已恢复原始值 {value}。',
        noteApplied: '已写入 {value}，下一次请求生效。',
        notePending: '上次请求仍使用 {actual}，下一次请求会使用 {value}。',
        errorRead: '读取模型目录失败：{message}',
        errorWrite: '写入失败：{message}',
        errorRange: '请输入 1 到 {max} 之间的整数。',
        errorNoAuto: '没有记录该模型的原始窗口值，请直接选择预设或自定义值。',
        diagTitle: '上下文窗口：无法读取模型目录',
        diagProvider: '提供商：{provider}',
        diagStage: '阶段：{stage}',
      },
      en: {
        label: 'Context',
        title: 'Context window',
        auto: 'Auto (model default)',
        autoUnknown: 'Auto (no baseline)',
        custom: 'Custom…',
        customPlaceholder: 'positive integer tokens',
        apply: 'Apply',
        catalog: 'Baseline',
        effective: 'Last request',
        recommended: 'Suggested',
        gateway: '{name} gateway',
        fixedTitle: 'This model has a fixed window of {value}',
        noteAbove: 'Above the baseline {base}. The gateway will reject the request if it cannot serve this window.',
        noteRestored: 'Restored the baseline {value}.',
        noteApplied: 'Wrote {value}; it applies to the next request.',
        notePending: 'The last request still used {actual}; the next one uses {value}.',
        errorRead: 'Could not read the model catalog: {message}',
        errorWrite: 'Write failed: {message}',
        errorRange: 'Enter an integer between 1 and {max}.',
        errorNoAuto: 'No baseline is recorded for this model; pick a preset or a custom value.',
        diagTitle: 'Context window: catalog unavailable',
        diagProvider: 'Provider: {provider}',
        diagStage: 'Stage: {stage}',
      },
    }

    const STYLE = {
      button: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        maxWidth: 168,
        padding: '0 8px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        fontSize: 12,
        lineHeight: 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      },
      buttonWarn: { borderColor: 'var(--dsw-alias-state-warn-primary)' },
      buttonValue: {
        color: 'var(--dsw-alias-label-primary)',
        fontVariantNumeric: 'tabular-nums',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      menu: {
        position: 'fixed',
        zIndex: 60,
        width: MENU_WIDTH,
        padding: 6,
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-overlay)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.28)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 12,
      },
      header: {
        padding: '4px 8px 6px',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 11,
        lineHeight: 1.4,
        overflowWrap: 'anywhere',
      },
      item: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
        padding: '6px 8px',
        border: 'none',
        borderRadius: 7,
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      },
      itemActive: { background: 'var(--dsw-alias-bg-layer-2)' },
      badge: {
        padding: '1px 5px',
        borderRadius: 5,
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-brand-primary)',
        fontSize: 10,
      },
      meta: {
        padding: '6px 8px 2px',
        borderTop: '1px solid var(--dsw-alias-border-l1)',
        marginTop: 4,
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 11,
        lineHeight: 1.6,
        overflowWrap: 'anywhere',
      },
      notice: { padding: '6px 8px 2px', fontSize: 11, lineHeight: 1.5 },
      inputRow: { display: 'flex', gap: 6, padding: '6px 8px 2px' },
      input: {
        flex: 1,
        minWidth: 0,
        height: 26,
        padding: '0 8px',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 7,
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: 12,
      },
      smallButton: {
        height: 26,
        padding: '0 10px',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 7,
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
      },
    }

    function hostOf(url) {
      if (typeof url !== 'string' || url.length === 0) return undefined
      try {
        const parsed = new URL(url)
        const local =
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname === 'localhost' ||
          parsed.hostname === '::1' ||
          parsed.hostname === '[::1]'
        return local ? Number(parsed.port) : undefined
      } catch {
        return undefined
      }
    }

    function detectGateway(provider, baseURL) {
      for (const gateway of GATEWAYS) {
        if (gateway.providers.indexOf(provider) >= 0) return gateway
      }
      const port = hostOf(baseURL)
      if (port !== undefined) {
        for (const gateway of GATEWAYS) {
          if (gateway.ports.indexOf(port) >= 0) return gateway
        }
      }
      return undefined
    }

    function formatTokens(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '\u2014'
      if (value % 1000000 === 0) return `${value / 1000000}M`
      if (value % 1000 === 0) return `${value / 1000}K`
      return String(value)
    }

    function isPositiveInteger(value) {
      return typeof value === 'number' && Number.isInteger(value) && value > 0
    }

    function readWindow(namespaceValue, provider, index) {
      const catalog =
        namespaceValue && typeof namespaceValue === 'object' ? namespaceValue.providers : undefined
      const profile = catalog && typeof catalog === 'object' ? catalog[provider] : undefined
      const models = profile && Array.isArray(profile.models) ? profile.models : []
      const entry = models[index]
      return entry && typeof entry === 'object' ? entry.contextWindow : undefined
    }

    /** Register the selector beside the composer submit action. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(LOCALE_NS, DICTIONARIES), 'ctx-window: dictionaries')
      const t = ctx.locale.bind(LOCALE_NS)
      let settings
      try {
        settings = ctx.remote.settings
      } catch (error) {
        settings = undefined
        console.warn('[ctx-window] inject:', String((error && error.message) || error))
      }
      const seen = new Map()

      function baselineOf(provider, model, current) {
        const key = `${provider}/${model}`
        if (seen.has(key)) return seen.get(key)
        const known = typeof BASELINES[key] === 'number' ? BASELINES[key] : current
        if (typeof known === 'number') seen.set(key, known)
        return typeof known === 'number' ? known : undefined
      }

      /** Subscribe to one session projection face without relying on slot props. */
      function useSessionFace(sessionId, key) {
        const [value, setValue] = useState(undefined)
        useEffect(() => {
          if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
          const sessions = ctx.get('sessions')
          if (sessions === undefined || typeof sessions.binding !== 'function') return undefined
          let face
          try {
            const binding = sessions.binding(sessionId)
            face =
              binding && binding.session && binding.session.projections
                ? binding.session.projections.faceOf(key)
                : undefined
          } catch {
            face = undefined
          }
          if (!face) return undefined
          const read = () => {
            try {
              setValue(face.getSnapshot())
            } catch {
              setValue(undefined)
            }
          }
          read()
          let off
          try {
            off = typeof face.subscribe === 'function' ? face.subscribe(read) : undefined
          } catch {
            off = undefined
          }
          return () => {
            try {
              if (typeof off === 'function') off()
            } catch {
              /* the face already went away */
            }
          }
        }, [sessionId, key])
        return value
      }

      function Control(props) {
        const sessionId = props && typeof props.sessionId === 'string' ? props.sessionId : undefined
        const hookProjection =
          props && typeof props.useProjection === 'function' ? props.useProjection : undefined

        const hookSelection = hookProjection ? hookProjection('modelSelection') : undefined
        const hookPressure = hookProjection ? hookProjection('contextPressure') : undefined
        const faceSelection = useSessionFace(sessionId, 'modelSelection')
        const facePressure = useSessionFace(sessionId, 'contextPressure')

        const selection = hookSelection !== undefined ? hookSelection : faceSelection
        const pressure = hookPressure !== undefined ? hookPressure : facePressure

        const route = selection && (selection.next || selection.lastUsed)
        const provider = route && typeof route.provider === 'string' ? route.provider : undefined
        const model = route && typeof route.model === 'string' ? route.model : undefined

        const [view, setView] = useState({ status: 'loading' })
        const [open, setOpen] = useState(false)
        const [anchor, setAnchor] = useState(null)
        const [draft, setDraft] = useState('')
        const [editing, setEditing] = useState(false)
        const [busy, setBusy] = useState(false)
        const [notice, setNotice] = useState(null)
        const buttonRef = useRef(null)
        const menuRef = useRef(null)

        const load = useCallback(async () => {
          if (provider === undefined || model === undefined) {
            setView({ status: 'hidden', provider })
            return
          }
          const fail = (stage, error) => {
            const message = String((error && error.message) || error)
            console.warn(`[ctx-window] ${stage}: ${message}`)
            setView({ status: 'error', stage, message, provider, model })
          }
          try {
            if (!settings || typeof settings.describe !== 'function') {
              fail('remote-settings', 'the settings Remote namespace is unavailable')
              return
            }
            const result = await settings.describe()
            if (!result || result.ok !== true) {
              fail('describe', (result && result.error && result.error.message) || 'settings/describe failed')
              return
            }
            const namespaces =
              result.value && Array.isArray(result.value.namespaces) ? result.value.namespaces : []
            const namespace =
              namespaces.find((entry) => entry && entry.ns === SETTINGS_NS) ||
              namespaces.find(
                (entry) =>
                  entry &&
                  entry.value &&
                  typeof entry.value === 'object' &&
                  entry.value.providers &&
                  entry.value.providers[provider] !== undefined,
              )
            if (!namespace) {
              fail('namespace', `no settings namespace carries provider "${provider}"`)
              return
            }
            const catalog =
              namespace.value && typeof namespace.value === 'object' ? namespace.value.providers : undefined
            const profile = catalog && typeof catalog === 'object' ? catalog[provider] : undefined
            if (!profile || typeof profile !== 'object') {
              setView({ status: 'hidden', provider })
              return
            }
            const gateway = detectGateway(provider, profile.baseURL)
            if (!gateway) {
              setView({ status: 'hidden', provider })
              return
            }
            const models = Array.isArray(profile.models) ? profile.models : []
            const index = models.findIndex((entry) => entry && entry.id === model)
            if (index < 0) {
              fail('model-entry', `model "${model}" is not a catalog entry of "${provider}"`)
              return
            }
            const current = models[index].contextWindow
            const tiers = tiersFor(provider, model)
            setView({
              status: tiers.length > 1 ? 'ready' : 'fixed',
              gateway,
              index,
              current,
              tiers,
              baseline: baselineOf(provider, model, current),
              revision: namespace.revision,
              provider,
              model,
            })
          } catch (error) {
            fail('load', error)
          }
        }, [provider, model])

        useEffect(() => {
          Promise.resolve(load()).catch(() => undefined)
        }, [load])

        useEffect(() => {
          if (!open) return undefined
          const onPointer = (event) => {
            const target = event.target
            if (menuRef.current && menuRef.current.contains(target)) return
            if (buttonRef.current && buttonRef.current.contains(target)) return
            setOpen(false)
          }
          const onKey = (event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              if (buttonRef.current) buttonRef.current.focus()
            }
          }
          const close = () => setOpen(false)
          document.addEventListener('pointerdown', onPointer, true)
          document.addEventListener('keydown', onKey, true)
          window.addEventListener('resize', close)
          window.addEventListener('scroll', close, true)
          return () => {
            document.removeEventListener('pointerdown', onPointer, true)
            document.removeEventListener('keydown', onKey, true)
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
          }
        }, [open])

        const openMenu = () => {
          const rect = buttonRef.current ? buttonRef.current.getBoundingClientRect() : null
          if (rect) {
            const left = Math.max(8, Math.min(window.innerWidth - MENU_WIDTH - 8, rect.right - MENU_WIDTH))
            setAnchor({ left, bottom: Math.max(8, window.innerHeight - rect.top + 8) })
          }
          setEditing(false)
          setDraft('')
          setNotice(null)
          setOpen(true)
        }

        const writeWindow = async (tokens) => {
          if (view.status !== 'ready') return false
          setBusy(true)
          setNotice(null)
          if (!settings || typeof settings.mutate !== 'function') {
            setNotice({ kind: 'error', text: t('errorWrite', { message: 'settings Remote unavailable' }) })
            setBusy(false)
            return false
          }
          const ops = [
            {
              op: 'set',
              path: ['providers', view.provider, 'models', String(view.index), 'contextWindow'],
              value: tokens,
            },
          ]
          try {
            let result = await settings.mutate(SETTINGS_NS, ops, view.revision)
            if (
              result &&
              result.ok !== true &&
              result.error &&
              String(result.error.code).indexOf('conflict') >= 0
            ) {
              const fresh = await settings.describe()
              const namespaces = fresh && fresh.ok ? fresh.value.namespaces : []
              const namespace = namespaces.find((entry) => entry && entry.ns === SETTINGS_NS)
              result = await settings.mutate(SETTINGS_NS, ops, namespace ? namespace.revision : undefined)
            }
            if (!result || result.ok !== true) {
              throw new Error(result && result.error ? result.error.message : 'settings/mutate failed')
            }
            const written = readWindow(result.value && result.value.value, view.provider, view.index)
            setView((previous) => ({
              ...previous,
              current: typeof written === 'number' ? written : tokens,
              revision:
                result.value && typeof result.value.revision === 'number'
                  ? result.value.revision
                  : previous.revision,
            }))
            setNotice({ kind: 'ok', text: t('noteApplied', { value: formatTokens(tokens) }) })
            setEditing(false)
            return true
          } catch (error) {
            console.warn('[ctx-window] mutate:', String((error && error.message) || error))
            setNotice({
              kind: 'error',
              text: t('errorWrite', { message: String((error && error.message) || error) }),
            })
            return false
          } finally {
            setBusy(false)
          }
        }

        const chooseAuto = async () => {
          if (view.status !== 'ready') return
          if (!isPositiveInteger(view.baseline)) {
            setNotice({ kind: 'error', text: t('errorNoAuto') })
            return
          }
          const value = view.baseline
          const ok = await writeWindow(value)
          if (ok) setNotice({ kind: 'ok', text: t('noteRestored', { value: formatTokens(value) }) })
        }

        const submitCustom = async () => {
          if (view.status !== 'ready') return
          const raw = draft.trim()
          if (!/^[0-9]+$/.test(raw)) {
            setNotice({ kind: 'error', text: t('errorRange', { max: formatTokens(HARD_MAX) }) })
            return
          }
          const value = Number(raw)
          if (!Number.isSafeInteger(value) || value < 1 || value > HARD_MAX) {
            setNotice({ kind: 'error', text: t('errorRange', { max: formatTokens(HARD_MAX) }) })
            return
          }
          await writeWindow(value)
        }

        const diag = view.status === 'error' ? view : undefined
        const fixed = view.status === 'fixed'
        if (view.status !== 'ready' && !fixed && diag === undefined) return null

        const current = view.status === 'ready' || fixed ? view.current : undefined
        const effective = pressure && typeof pressure === 'object' ? pressure.contextWindow : undefined
        const label = view.status === 'ready' || fixed ? formatTokens(current) : '\u26a0'
        const autoKnown = view.status === 'ready' && isPositiveInteger(view.baseline)
        const above =
          view.status === 'ready' && autoKnown && isPositiveInteger(current) && current > view.baseline

        if (fixed) {
          return h(
            'button',
            {
              type: 'button',
              'aria-disabled': 'true',
              style: { ...STYLE.button, cursor: 'default', opacity: 0.7 },
              'aria-label': `${t('title')}: ${label}`,
              title: t('fixedTitle', { value: label }),
            },
            h('span', null, t('label')),
            h('span', { style: STYLE.buttonValue }, label),
          )
        }

        const trigger = h(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            style: diag ? { ...STYLE.button, ...STYLE.buttonWarn } : STYLE.button,
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            'aria-label': `${t('title')}: ${label}`,
            title: diag
              ? `${t('diagTitle')} \u00b7 ${diag.stage}: ${diag.message}`
              : `${t('gateway', { name: view.gateway.name })} \u00b7 ${provider}/${model} \u00b7 ${t('title')} ${label}`,
            onClick: () => (open ? setOpen(false) : openMenu()),
          },
          h('span', null, t('label')),
          h('span', { style: STYLE.buttonValue }, label),
        )

        if (diag) {
          return h(
            React.Fragment,
            null,
            trigger,
            open && anchor
              ? h(
                  'div',
                  {
                    ref: menuRef,
                    role: 'dialog',
                    'aria-label': t('diagTitle'),
                    style: { ...STYLE.menu, left: anchor.left, bottom: anchor.bottom },
                  },
                  h('div', { style: STYLE.header }, t('diagTitle')),
                  h(
                    'div',
                    { style: { ...STYLE.meta, borderTop: 'none', marginTop: 0 } },
                    h('div', null, t('diagProvider', { provider: String(diag.provider) })),
                    h('div', null, t('diagStage', { stage: String(diag.stage) })),
                    h('div', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, String(diag.message)),
                  ),
                )
              : null,
          )
        }

        return h(
          React.Fragment,
          null,
          trigger,
          open && anchor
            ? h(
                'div',
                {
                  ref: menuRef,
                  role: 'dialog',
                  'aria-label': t('title'),
                  style: { ...STYLE.menu, left: anchor.left, bottom: anchor.bottom },
                },
                h(
                  'div',
                  { style: STYLE.header },
                  `${t('gateway', { name: view.gateway.name })} \u00b7 ${provider}/${model}`,
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    role: 'menuitemradio',
                    'aria-checked': autoKnown && current === view.baseline ? 'true' : 'false',
                    disabled: busy,
                    style: {
                      ...STYLE.item,
                      ...(autoKnown && current === view.baseline ? STYLE.itemActive : {}),
                    },
                    onClick: chooseAuto,
                  },
                  h('span', null, autoKnown ? t('auto') : t('autoUnknown')),
                  h(
                    'span',
                    { style: { color: 'var(--dsw-alias-label-secondary)' } },
                    autoKnown ? formatTokens(view.baseline) : '\u2014',
                  ),
                ),
                (view.tiers || PRESETS).map((preset) =>
                  h(
                    'button',
                    {
                      key: String(preset),
                      type: 'button',
                      role: 'menuitemradio',
                      'aria-checked': current === preset ? 'true' : 'false',
                      disabled: busy,
                      style: { ...STYLE.item, ...(current === preset ? STYLE.itemActive : {}) },
                      onClick: () => writeWindow(preset),
                    },
                    h(
                      'span',
                      null,
                      formatTokens(preset),
                      view.gateway.recommended === preset
                        ? h('span', { style: { ...STYLE.badge, marginLeft: 6 } }, t('recommended'))
                        : null,
                    ),
                    current === preset ? h('span', { 'aria-hidden': 'true' }, '\u2713') : null,
                  ),
                ),
                editing
                  ? h(
                      'div',
                      { style: STYLE.inputRow },
                      h('input', {
                        style: STYLE.input,
                        inputMode: 'numeric',
                        value: draft,
                        placeholder: t('customPlaceholder'),
                        autoFocus: true,
                        onChange: (event) => setDraft(event.target.value),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            submitCustom()
                          }
                        },
                      }),
                      h(
                        'button',
                        { type: 'button', style: STYLE.smallButton, disabled: busy, onClick: submitCustom },
                        t('apply'),
                      ),
                    )
                  : h(
                      'button',
                      {
                        type: 'button',
                        role: 'menuitem',
                        style: STYLE.item,
                        onClick: () => {
                          setEditing(true)
                          setDraft(isPositiveInteger(current) ? String(current) : '')
                        },
                      },
                      h('span', null, t('custom')),
                    ),
                h(
                  'div',
                  { style: STYLE.meta },
                  h('div', null, `${t('catalog')}: ${formatTokens(view.baseline)}`),
                  h('div', null, `${t('effective')}: ${formatTokens(effective)}`),
                  above
                    ? h(
                        'div',
                        { style: { color: 'var(--dsw-alias-state-warn-primary)' } },
                        t('noteAbove', { base: formatTokens(view.baseline) }),
                      )
                    : null,
                  isPositiveInteger(effective) && isPositiveInteger(current) && effective !== current
                    ? h(
                        'div',
                        { style: { color: 'var(--dsw-alias-state-warn-primary)' } },
                        t('notePending', {
                          actual: formatTokens(effective),
                          value: formatTokens(current),
                        }),
                      )
                    : null,
                ),
                notice
                  ? h(
                      'div',
                      {
                        style: {
                          ...STYLE.notice,
                          color:
                            notice.kind === 'error'
                              ? 'var(--dsw-alias-state-error-primary)'
                              : 'var(--dsw-alias-state-success-primary)',
                        },
                      },
                      notice.text,
                    )
                  : null,
              )
            : null,
        )
      }

      ctx.slots.inject(SLOT, () => ctx.slots.register({ name: SLOT, id: 'ctx-window', order: 20 }, Control))
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.settings'],
      apply,
    }
  },
})
