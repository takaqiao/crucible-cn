# Crucible 中文翻译 / Crucible Chinese Translation

[![GitHub release](https://img.shields.io/github/v/release/takaqiao/crucible-cn?style=flat-square&label=release&logo=github)](https://github.com/takaqiao/crucible-cn/releases/latest)
[![Foundry version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Furl%3Dhttps%3A%2F%2Fgithub.com%2Ftakaqiao%2Fcrucible-cn%2Freleases%2Flatest%2Fdownload%2Fmodule.json&style=flat-square)](https://foundryvtt.com/packages/crucible-cn)
[![Total downloads](https://img.shields.io/github/downloads/takaqiao/crucible-cn/total?style=flat-square&label=downloads&color=brightgreen)](https://github.com/takaqiao/crucible-cn/releases)
[![Latest downloads](https://img.shields.io/github/downloads/takaqiao/crucible-cn/latest/total?style=flat-square&label=latest)](https://github.com/takaqiao/crucible-cn/releases/latest)
[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v13%20%7C%20v14-orange?style=flat-square&logo=foundryvirtualtabletop&logoColor=white)](https://foundryvtt.com/)
[![Crucible](https://img.shields.io/badge/system-Crucible-b35c00?style=flat-square)](https://foundryvtt.com/packages/crucible)
[![Babele](https://img.shields.io/badge/Babele-required-7b3f99?style=flat-square)](https://foundryvtt.com/packages/babele)

为 Foundry VTT 的 **Crucible** 系统及其官方合集提供中文翻译，依赖 Babele 加载。

## 安装 / Install

在 Foundry → **附加模块 → 安装模块** 中粘贴 manifest URL：

```
https://github.com/takaqiao/crucible-cn/releases/latest/download/module.json
```

或在 Foundry 包浏览器搜索 `crucible-cn`。

## 内容 / Contents

- `lang/cn.json` — 系统主体 i18n
- `compendium/cn/*.json` — Babele 翻译的合集包 JSON
- `babele-register.js` — Babele 注册入口
- `styles/crucible-cn.css` — 中文字体回退（Crucible 原字体 AwerySmallcaps /
  Vollkorn / CaslonAntique 实测 CJK 码位为 0，回退链末端只有裸 `serif`）
- `scripts/` — 翻译稽核与维护脚本（未翻译扫描、双语命名修复、术语漏检等）。
  **仅存于仓库，不进发布包** —— 运行时不会加载，打进 zip 只是死重量
- `lang/en.json` — 英文基准，供 `lang_gap.py` / `flatten_lang.py` 逐键比对用。
  `module.json` 的 `languages` 只声明 `cn`，故此文件同样**不进发布包**

## 依赖 / Requires

- Foundry VTT **v14**（Crucible 0.10.1 自身要求核心 ≥ 14.364）
- Crucible 系统 **v0.10.1+**
- [Babele](https://foundryvtt.com/packages/babele) **v2.9.1+**

> 三项都由 Foundry 强制校验（版本不满足时**直接拒绝启用**，而不是只给个警告），
> 但**写在不同字段里**：核心版本看 `module.json` 的 `compatibility`，
> Babele 看 `relationships.requires`，Crucible 系统看 `relationships.systems`。
> ⚠ 非 `type: "module"` 的条目放进 `relationships.requires` 是**完全不生效**的 ——
> Foundry v14 里读它的四条路径全部第一句就 `if (type !== "module") continue`。
> Babele 2.9.1 是硬下限 —— 详见 `babele-register.js` 文件头：注册挂在 Babele 自己的
> `babele.init` 钩子上，并依赖 2.9.1 原生的 `ActiveEffect` 映射与递归 `document` 转换器。
>
> These are enforced by Foundry through `relationships.requires` in `module.json`;
> older versions are refused, not merely warned about.

## 维护脚本 / Maintenance scripts

仓库 `scripts/` 下的 Python 工具用于翻译质量稽核：

| 脚本 | 用途 |
|---|---|
| `scan_untranslated.py` / `scan_untranslated_deep.py` | 扫描合集中残留的未翻译英文 |
| `find_untranslated_english.py` | 找出疑似纯英文条目 |
| `repair_bilingual_names.py` | **只读报告**：列出疑似中英混排的实体名。判据是纯形状的，本库实测 652 条建议**没有一条可以直接采用**，所以它不写盘；确认要改的走 `3-常用脚本/qa/apply_translations.py` |
| `scan_word_leaks.py` | **只读报告**：找出中文串里夹着的单个英文词。配套的 `fix_word_leaks.py` 已于 2026-08-14 删除 —— 它按纯形状判据（「这串里有中文」）直接覆盖写 `compendium/cn/*.json` 与 `lang/cn.json`，不看英文原文、无 `--dry-run`、白名单 `ALLOW` 是从未被引用的死代码，词表里还混着 `Tier→等级`（本项目定译是「阶」）、`slug→标识符`、`Critical→致命` 这类普通词。要落地的改动一律走 `3-常用脚本/qa/apply_translations.py`（英文源漂移 / 无中文 / 标记破损三道闸） |
| `audit_all.py` | 一键全量稽核 |

Issue / PR 欢迎 — 翻译错误、术语建议、兼容性反馈都会处理。
