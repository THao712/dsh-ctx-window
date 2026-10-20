# DeepSeek Harness 컨텍스트 윈도우 선택 플러그인

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness%20%3E%3D%200.2.1--rc.2-informational)

**Qoder**와 **Trae** 리버스 프록시 게이트웨이가 제공하는 모델에 대해, 입력창 옆에 컨텍스트 윈도우 선택기를 추가하는 DeepSeek Harness 번들입니다.

선택한 값은 Harness가 공개한 설정 API를 통해 해당 모델의 프로바이더 카탈로그에 있는 `contextWindow`에 기록됩니다. 따라서 이것은 라벨이나 캐시된 주석이 아니라, 요청 비용 산정, 컨텍스트 사용량 표시, 압축 시작 판단에 실제로 사용되는 값입니다.

---

## 개요

Harness는 대화의 토큰 예산을 선택된 모델의 어댑터 메타데이터에서만 도출합니다. 세션 단위 재정의는 존재하지 않으므로, 지원되는 유일한 조정 지점은 프로바이더 카탈로그 항목 자체입니다.

이 번들은 그 조정 지점을 한 번의 클릭으로 제공하며, 대상은 실제로 윈도우 변경을 지원하는 게이트웨이로 한정하고, 메뉴에는 각 모델이 공개한 윈도우만 표시합니다.

## 동작 방식

`conversation.input.right` 슬롯에 항목 하나를 등록하고, 선택 시 `settings/mutate`를 한 번 호출합니다.

```text
llm-pi-ai → providers.<provider>.models[<index>].contextWindow = <tokens>
```

이것은 "설정 → 모델" 페이지가 수행하는 쓰기와 동일하므로 추가 권한이 필요하지 않고 부작용도 없습니다. 이후 Harness는 해당 카탈로그 항목에서 다음을 도출합니다.

- 요청마다 기록되는 `request/context.contextWindow`
- 컨텍스트 사용량 표시기의 분모
- `dsh-compaction-basic`의 압축 임계값

몽키 패치, DOM 주입, `localStorage` 사용, 자격 증명 접근은 모두 수행하지 않습니다.

## 지원 게이트웨이

업스트림이 실제로 윈도우 변경을 지원하는 게이트웨이만 대상으로 합니다. **WorkBuddy는 의도적으로 제외**했습니다. 해당 서비스는 선택 가능한 윈도우를 지원하지 않으므로, 그곳에 조작 UI를 두는 것은 제공할 수 없는 기능을 약속하는 일이 됩니다.

게이트웨이는 먼저 프로바이더 ID(`qoder-intl-proxy`, `qoder-cn-proxy`, `trae-proxy`)로 식별하고, 다음으로 해당 포트(8790, 8000)의 루프백 `baseURL`로 식별합니다. 따라서 이름이 변경된 프로바이더도 인식되며, 원격 프로바이더는 절대 인식되지 않습니다.

### Qoder

Qoder는 모델마다 사용 가능한 윈도우 집합을 공개합니다. 메뉴에는 그 값만 표시하며, 윈도우가 하나뿐인 모델은 고정 칩으로 표시합니다.

| 모델 | 国内版 | 国际版 |
|---|---|---|
| `Auto` | 200K (고정) | 200K (고정) |
| `Qwen3.8-Max`, `Qwen3.8-Flash`, `Qwen3.7-Max`, `Qwen3.7-Plus`, `Qwen3.7-Flash` | 200K / 400K / 1M | 200K / 400K / 1M |
| `DeepSeek-V4-Pro`, `DeepSeek-Flash` | 200K / 400K / 1M | 200K / 400K / 1M |
| `GLM-5.3`, `GLM-5.3-Flash`, `GLM-5.2` | 200K / 400K / 1M | 200K / 400K / 1M |
| `Kimi-K3`, `Kimi-K2.8-Preview` | 200K / 400K / 1M | 200K / 400K / 1M |
| MiniMax | 200K (고정) | 200K / 400K / 1M |
| `Ultimate`, `Sonus`, `Cantus` | — | 200K / 400K / 1M |
| `Performance` | — | 272K / 400K / 1M |
| `Efficient` | — | 200K (고정) |

### Trae

Trae는 모델마다 정확히 두 개의 윈도우를 가집니다. 릴레이 자체의 계정 카탈로그(`context_window_tokens.dev` 및 `.max`)에서 읽은 표준 윈도우와 선택적 1M 프로파일입니다.

| 모델 | 표준 | 1M 프로파일 |
|---|---|---|
| `deepseek-v4.1-flash`, `DeepSeek-V4-Flash-Official`, `DeepSeek-V4-Pro-Official`, `glm-5.2`, `glm-5.3`, `glm-5.3-flash`, `glm-5.3-flashx`, `kimi-k3`, `minimax-m3`, `minimax-m3.1-flash`, `qwen3.8-max`, `qwen-3.7-plus`, `step-5-preview` | 200K | 1M |
| `mimo-v2.6-flash`, `mimo-v2.6-pro` | 200K | 981,504 |
| `Doubao-Seed-2.1-Pro`, `Doubao-Seed-Evolving` | 256K | 1M |
| `Doubao-Seed-2.1-Turbo`, `Doubao-Seed-Code` | 256K | — (고정) |
| `kimi-k2.6`, `kimi-k2.7-code` | 200K | — (고정) |

1M 프로파일은 이 번들이 아니라 릴레이의 기능입니다. 릴레이 자체의 Max 모드 스위치가 꺼져 있으면 1M로 보낸 요청은 폴백되거나 실패합니다. 이 경우 표준 윈도우를 선택하십시오.

## 설치

이 번들은 일반적인 Harness 플러그인 패키지입니다. `package.json`이 `dsh.bundle.patch`와 `dsh.client`를 선언하고, `cordis.patch.yml`이 플러그인 행을 삽입합니다.

```text
plugin_manager.install_bundle  github:THao712/dsh-ctx-window
```

로컬 체크아웃도 같은 방식으로, GitHub 지정 대신 해당 디렉터리를 전달하여 설치합니다.

요구 사항:

- DeepSeek Harness 0.2.1-rc.2 이상
- 지원 게이트웨이를 하나 이상 포함하는 `llm-pi-ai` 프로바이더 설정
- 최초 설치 후 한 번의 페이지 새로 고침 (클라이언트 모듈은 부팅 시 로드됩니다)

## 사용 방법

1. 지원 게이트웨이의 모델을 선택합니다.
2. 전송 버튼 옆의 **컨텍스트** 컨트롤을 엽니다.
3. 윈도우를 선택합니다. 메뉴에는 카탈로그 원래 값, 직전 요청에서 사용된 윈도우, 그리고 선택한 값이 원래 값을 초과할 때의 경고가 표시됩니다.

모든 모델에는 **자동(모델 기본값)**도 제공되며, 이 번들이 쓰기 전에 수집한 값을 복원합니다. 또한 게이트웨이가 허용하지만 공개하지 않은 윈도우를 위해 검증된 사용자 지정 정수(`1 … 4,000,000`)를 입력할 수 있습니다.

선택한 값은 **다음** 요청부터 적용되며, 현재 요청은 준비 시점의 윈도우를 유지합니다. 메뉴가 두 값을 함께 보여 주므로, 아직 반영되지 않은 쓰기는 암시가 아니라 명시적으로 드러납니다.

## 검증

실제 환경에서 확인했습니다.

- `qoder-cn-proxy` → `DeepSeek-Flash`에서 선택하면 프로파일 카탈로그에 `contextWindow: 400000`이 기록되었고, 같은 프로바이더의 다른 모델은 변경되지 않았습니다.
- 직후 요청은 `request/context`에 `{provider: "qoder-cn-proxy", model: "DeepSeek-Flash", contextWindow: 400000}`을 기록했으며 게이트웨이가 정상 응답했습니다.
- `trae-proxy` → `deepseek-v4.1-flash`를 `1,000,000`으로 설정한 뒤 연속 두 번의 요청이 모두 `contextWindow: 1000000`으로 기록되었고 두 요청 모두 응답이 있었습니다.

## 설계상 제약

컨텍스트 윈도우는 **모델**에 속하며 세션에는 속하지 않습니다. Harness에는 세션 단위 재정의가 없습니다. `LlmCallConfig`에 윈도우 필드가 없고, 어댑터는 프로바이더별로 배타적이며, 해석 단계의 인터셉트 지점도 존재하지 않습니다. 따라서 이 번들은 해당 모델을 사용하는 모든 세션이 공유하는 카탈로그 항목을 변경하며, 같은 모델의 두 세션이 서로 다른 윈도우를 가질 수는 없습니다.

선택기는 메뉴를 각 모델이 공개한 윈도우로 제한할 뿐, 업스트림이 임의의 사용자 지정 값을 수용하는지 검증하지는 않습니다. 서비스의 실제 용량을 초과하는 요청은 해당 서비스에서 거부됩니다.

## 알려진 업스트림 문제

`trae-proxy`는 턴의 특정 단계에서 `Object of type set is not JSON serializable`(`PI_AI_ERROR`, 사용량 카운터는 모두 0) 오류로 간헐적으로 실패합니다. 이 현상은 이 번들이 존재하기 전에도 관측되었고, 설정된 윈도우와 무관하게 턴의 첫 단계나 이후 단계에서 발생하며, 요청이 어댑터를 떠나기 전에 일어납니다. 재시도로 회복되며, 수정이 필요한 쪽은 릴레이입니다.

## 제거

번들을 비활성화하거나 삭제하십시오. 서비스, 리스너, 세션 상태를 보유하지 않습니다. 이미 기록된 값은 프로파일 카탈로그에 남으며 **자동** 또는 "설정 → 모델" 페이지에서 되돌릴 수 있습니다.

## 저장소 구조

| 경로 | 용도 |
|---|---|
| `index.js` | 호스트 측. 설정을 선언하지 않으며 이유는 파일 내 주석에 있습니다. |
| `client.js` | 전체 기능: 슬롯 등록, 게이트웨이 식별, 티어 표, 선택기. |
| `cordis.patch.yml` | `ctx-window` 플러그인 행을 삽입합니다. |
| `locale/*.json` | 설정 페이지에 표시되는 플러그인 이름과 설명. |
| `icon.svg` | 자체 제작한 윈도우 아이콘. |

## 라이선스

MIT. [LICENSE](LICENSE)를 참조하십시오.
