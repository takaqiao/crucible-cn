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

### 0.9.3 重点

本版由一次全库审计（27 个并行审计单元 + 逐条对抗验证）驱动，修的多数是**上一版全部自动检查都报 0、
却仍然存在**的缺陷 —— 因为当时的判据本身有盲区。

- **规则书的天赋点发错了**：升级页写「每级 2 点天赋点」，而系统实际发 **3 点**
  （上游 0.10.1 改过这个数，中文停在旧版）。照中文建卡到 12 级会少 11 点天赋。
- **三个符文精通天赋的机制被改写**：`Voidcaller` 与 `Necromancer` 的成长属性**互相写反**了
  （湮灭符文用智力、死亡符文用存在）；`Necromancer` / `Dustbinder` 把英文的 **half**（一半）整个丢掉，
  持续 3 轮的伤害因此翻倍。`Voidcaller` 还把伤害池 Health 写成了士气。
- **两处规则把「Half of」译成「任何」**：坚韧为 0 的无实体生物、存在为 0 的无心智生物，
  会拿到英文规则**两倍**的替代资源池，GM 建怪直接建错。
- **词缀译文此前运行时根本不生效**（约 169 条）：`ActiveEffect` 没有注册 Babele 映射层，
  `adjective` / `actions` 两个键永远不会被查 —— 玩家看到的是 `Acid-Warding长剑`、动作卡 `Replenish Action`。
  已补上映射层。
- **法术手势的界面名与合集对不上**：`Fan/Blast/Ward/Ray/Surge/Conjure/Cone` 七个的界面标签
  （扇子/爆炸咒/防护罩/光线/激涌/咒法系/锥形区域）在全部译文里零支持，
  而法术名是用界面标签在运行时拼的 —— 学的是「手势：射线」，法术栏里却出现「火焰光线」。
  已统一为 扇形/爆破/防护/射线/涌动/召唤/锥形。
- **合集侧边栏的文件夹名**现在也是中文了（对手选项 / 角色选项 / 角色 / 物品）。
- 术语落实：`Inflection`→屈折（与 `Affix` 词缀分开）、`Signature`→招牌、`Presence`→存在、
  `Shocked`→感电、`Boon`→恩惠骰、`Arrow`→箭矢、`Acid`→强酸、
  `Electricity Resistance`→电击抗性（原「电抗性」在中文是电工学的 reactance）、
  `Elvish`/`Orcish` 祖裔去掉误加的「语」字、`Rallying Threshold`→集结阈值（与角色卡一致）。
- 预生角色卡：姓名栏与自述用了两个名字的 3 处已对齐；地图上 token 名的
  「先驱者 of 疯狂」这类机械替换产物已重写。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
