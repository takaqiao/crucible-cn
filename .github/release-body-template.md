## 安装 / Install

在 Foundry → **附加模块 → 安装模块** 中粘贴以下 manifest URL：

```
https://github.com/takaqiao/crucible-cn/releases/latest/download/module.json
```

## 依赖 / Requires

- Foundry VTT v13 ~ v14
- Crucible 系统 v0.7.7+
- [Babele](https://foundryvtt.com/packages/babele) v2.7.5+

## 变更 / Changes

### 0.9.1 重点

- **跟上上游规则改动 55 条**，并推到 24 个英文逐字相同的同源副本。
  影响实际跑团的包括 Pyromancer（属性与轮数）、Bloodletter、Concussive Blows、
  Counter Riposte、Twinned Shot、Evasive Shot 等。
- **修复夹击规则漏译**：英文是「近战攻击检定 +1」，中文漏了「近战」，
  等于让远程攻击也吃到这个加值。
- **补齐 158 条从未翻译的条目** —— 预生角色 Fizzit 与 Zarajah 此前几乎整体没译。
- 术语：`Fortitude` 改译 **强韧**，与属性 `Toughness`（坚韧）解除撞名，
  三项防御成为 强韧 / 反射 / 意志；`Boon` 统一为 **恩惠骰**；
  另修 `lang` 里的 精确→精准、声乐→言语、听觉的→听觉、机械的→机械。
- 修复 `lang/cn.json` 中 46 个 Foundry 查不到的键；清理 74 条死键。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
