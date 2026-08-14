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
