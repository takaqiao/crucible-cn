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

### 0.9.6 重点

第十二轮收口：把所有仍非零的报告清到零或清成有据可查的永久豁免。

- **判据降噪**：全库「同一英文串多种中文」的判据加了双语尾巴归一 ——
  本库既定约定是 `name` 写「护盾术 Shield」而 `tokenName` 写「护盾术」，
  原判据把这条约定整个当缺陷报，479 组里 463 组是它。现为 14 组，且全部有据可查。
- **死键清零**：`_legacyActions` 下 8 条寄存键经核实抢救早已完成（同段内容已在
  `crucible.equipment` 等三处按 id 建键译好），已删。
- 术语：`Senses` 分类文件夹由「感知」改为**感官**（「感知」是 `Wisdom` 的定译，也是 Sense 手势名）；
  `Monstrosities` 统一为**畸怪**。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
