## 安装 / Install

在 Foundry → **附加模块 → 安装模块** 中粘贴以下 manifest URL：

```
https://github.com/takaqiao/crucible-cn/releases/latest/download/module.json
```

## 依赖 / Requires

- Foundry VTT **v14**（Crucible 0.10.1 自身要求核心 ≥ 14.364）
- Crucible 系统 **v0.10.1+**
- [Babele](https://foundryvtt.com/packages/babele) **v2.9.1+**

> 这三项都由 Foundry 强制校验，版本不满足时直接拒绝启用，而不是只给个警告：
> 核心版本看 `module.json` 的 `compatibility`，Babele 看 `relationships.requires`，
> Crucible 系统看 `relationships.systems`。请先升级系统与 Babele 再装本模块。
> Enforced by Foundry: core version via `compatibility`, Babele via
> `relationships.requires`, and the Crucible system via `relationships.systems`.

## 变更 / Changes

### 0.9.9 重点

**`Rank` 统一为「阶位」。** Crucible 里 `Tier`（阶）、`Rank`（阶位）、`level`（等级）是三样东西，
而此前技能训练阶位、天赋训练阶位、敌手阶位等大量位置写作「等级」，与角色等级同名 ——
`Skill Ranks` 已是「技能阶位」而同一屏的「花费技能点提升你的技能等级」还写着等级。
本版把合集 176 叶与界面 9 个键一次统稿到位。

> 散文里表身份的 rank（公民地位、教团职位、军衔、`rank-and-file`）**不在此列**，逐处核过。

- **`Token` → 指示物**：与 Foundry 核心中文包 `foundry_chn` 对齐（该包 `TOKEN` 相关键 53 : 0
  全用「指示物」），界面上写「令牌」会让玩家找不到对应控件。
- **`Shard Goddess`**：有一处误写成「晶片女神」（芯片义），订正为「碎片女神」。
- **上游改动跟进**：`Surgeweaver` 与 `Rimecaller` 的属性来源已由固定的智力/感知改成
  「你风暴符文所依据的属性」，中文此前停在旧文本。

### 判据

本版另修了一个长期存在的检查漏洞：守「阶/阶位/等级」三分的那条断言，其判据**从来只检查配置
自身、根本不读库**，因此四个发布版一直报绿，底下压着 14 条界面字符串与 176 叶正文的违规。
判据已改为读库，并补上「任何断言都必须能报出本次扫了多少叶/多少键」的自检。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.

### 0.9.8 重点

第十四轮：把上一轮遗留的 270 条缺陷**逐条对当前代码重新核实**（其中 63 条上一版已修、
1 条前提本身是错的），再把确认仍在的 203 条全部处理完。

- **合集内容**：术语与译文一致性修复若干（屠龙毒药的品质档位表把「伤害/持续轮数」绑反、
  `Control Water` 的「轮 / 回合」、模板族译文碎片化等）。
- **界面字符串**：`lang/cn.json` 补 13 键，含把生命符文的形容词由「至关重要的」订正为「生机的」
  —— 它会直接拼进法术名，原译会合成出「至关重要的打击」。
- **`babele-register.js`**：修正会把已装中文模块的「排序」顶回英文的一行写入；
  补齐合集来源设置窗等处的顶层界面标签。
- **中文字体回退**：新增 `styles/crucible-cn.css`。Crucible 的三个字体文件里
  **一个中日韩字形都没有**，中文此前会掉到浏览器默认衬线字体上。现在只在回退链末尾补中文字体，
  拉丁字母仍由原字体渲染，保留系统原本的观感。
- **发布流程**：打包步骤补上回包断言（此前只有 ember 侧有），防止英文基准或维护脚本被打进包里。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
