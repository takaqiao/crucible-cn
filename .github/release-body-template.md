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

### 0.9.11 — 自检面板的两处误报修正 + 报告可滚动

首次在真实世界跑面板就暴露了**面板自己的三个问题**，全部已修：

- **「Babele 一份译文都没认到」是假警报**。它读了一个根本不存在的属性，读到空值就报红 ——
  而同一份报告里「合集索引抽样 137/137 全中文」明摆着说明 Babele 在正常工作。
  改用 Babele 的公开接口逐个合集查。
- **「区域行为字段仍是英文」的 5 条也是假警报**。其中四条是 Foundry 自带的行为类型
  （不归本模块翻），第五条的值是一个待本地化的**词条键**而不是英文原文。
  现在只查 Ember 自己的行为类型，并跳过词条键。
- **报告窗口加了滚动条**，内容也可以正常框选复制了（此前长报告只能看到开头一截）。

> 一个把「读到空值」当成「出问题了」的检查，制造的是假警报 —— 比不检查更糟。
> 这两处正是面板自己那条原则（「0 个问题」与「没查到东西」必须分开）在实现上没做到。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.

### 0.9.10 — 新增「汉化自检面板」，并订正一处规则说明

**自检面板**：配置设置 → 模块设置 → 打开汉化自检面板。
当场核一遍译文通道到底有没有生效（Babele 认到了几份译文、合集里的名字是不是中文、
经过裁决的界面词条值对不对、已废写法有没有回潮…），并可一键复制 Markdown 报告。

> ⚠ 面板会明确区分**「查过了没问题」**与**「无从查起」** —— 前提不满足的项标成后者，
> 绝不显示成绿色。

**规则订正**：夹击说明里「自动为针对该被夹击生物的攻击检定施加正确数量的恩惠骰」
漏了 `melee` 这个限定，已补为「**近战**攻击检定」—— 原文会让人以为远程攻击也吃夹击加值。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.

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
