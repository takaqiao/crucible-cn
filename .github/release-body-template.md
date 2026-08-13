## 安装 / Install

在 Foundry → **附加模块 → 安装模块** 中粘贴以下 manifest URL：

```
https://github.com/takaqiao/crucible-cn/releases/latest/download/module.json
```

## 依赖 / Requires

- Foundry VTT v13 ~ v14
- Crucible 系统 **v0.10.1+**
- [Babele](https://foundryvtt.com/packages/babele) **v2.9.1+**

> 这三项由 `module.json` 的 `relationships.requires` 强制校验：版本不满足时
> Foundry 会直接拒绝启用本模块，而不是只给个警告。请先升级系统与 Babele 再装本模块。
> Enforced by Foundry via `relationships.requires` — older versions are refused, not warned.

## 变更 / Changes

### 0.9.5 重点

本版随 Ember 汉化的第八～十一轮审计一同产出。crucible 侧改动量不大，但都在规则文本上。

- **规则被悄悄改写的几处已订正**：`scales using Dexterity`（以敏捷成长）被译成「具有灵巧属性」，
  同一句英文的 16 份副本全都这么错；`Any character who contributed to`（有出力的那些角色）
  被译成「队伍中的每名角色」，把获得同调的对象整个扩大了。
- **`Round`（轮）与 `Turn`（回合）互换**的若干处已改回 —— 这两个是不同的时间单位。
- **泛指句被写死成具体属性**：`the ability score your Rune of Earth scales with`
  （你的大地符文所依据的那项属性）被写成「感知」，日后符文改按别的属性成长就成了错的规则文本。
- **同一段英文在库内有多种中文**：全库 1514 组、8308 叶，已压到 479 组 —— 其中
  「英文正文超过 300 字符」那一档（几乎必是缺陷）由 357 组清零。
- **术语统一**：`Cold` 伤害统一为「寒冷」（原有「冰寒」混用）、`Presence` 统一为「存在」
  （原有「风采」「风范」，还有一处写成「感知力」而「感知」是 `Wisdom` 的定译，两个属性被混成了一个）、
  `Tier` 统一为「阶」。
- **`Confused` 状态**由「神志混乱」改为**混乱**，与掷骰界面和条件页一致。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
