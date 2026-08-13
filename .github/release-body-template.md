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

### 0.9.4 重点

本版随 Ember 汉化的五轮多维度审计一同产出，crucible 侧改动量较小但都在玩家看得见的地方。

- **两处外链彻底失效**：HTML 的 `target` 属性名被译成了中文「目标」，
  浏览器整个忽略它 —— 点 Dice So Nice 的推荐链接不会开新标签，而是把整个 Foundry 窗口导航走。
- **术语全库统一**：`Critical Success` 三种写法（大成功／重大成功／严重成功）统一为**大成功**、
  `Critical Failure` 统一为**严重失败**，与掷骰界面上的写法一致；
  攻击标签表里的 `Natural` 由「天然」改为「天生」（与「天生武器熟练度」等条目名一致）；
  「以强韧为目标」补回漏掉的「防御」二字。
- **拿法语社区汉化 Crucible-FR 做了一次独立交叉校验**，查出 12 类术语分歧
  （词缀 `Tenacity` 的中文与属性「坚韧」撞车等），并由此发现了 Scene 层级名从未被翻译的管线缺口。
- **同一样东西两个中文名**已统一：`Talons` 的「钩爪」与撬棍/链钩的「钩爪」撞词，改为利爪；
  `Thick Hide` 的「厚皮」已被 `Thick Skin` 占用，改为厚实兽皮；
  `Aquatic Breathing` 的「水下呼吸」已被 `Water Breathing` 占用，改为水生呼吸。
- 试玩测试冒险：竞技场的层级名与八个预生角色的 token 名现已汉化；
  第 4/5/6 天的页名此前只译了「第4天/第5天/第6天」、副标题整块丢失，已补全。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
