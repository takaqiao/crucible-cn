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
  仅用于仓库维护，不随发布包分发
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
| `repair_bilingual_names.py` | 只读报告：列出疑似中英混排的实体名。结果需要对照原文人工检查，不能直接应用 |
| `scan_word_leaks.py` | 只读报告：查找中文字符串中残留的英文词。旧版自动修复脚本已删除；修改前须对照原文，并检查术语和标记结构 |
| `audit_all.py` | 一键全量稽核 |

翻译错误、术语建议和兼容性问题可通过 Issue 或 PR 反馈。
