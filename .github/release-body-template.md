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

### 0.9.7 重点

- `babele-register.js` 两处修正。
- `module.json` / README / 发布说明里对依赖强制校验的描述与实际不符，已订正。
- 若干译文与术语一致性修复。
- 项目工具链（术语表构建、TM 回填、双语并列修复脚本）修掉数处会**持续制造回归**的缺陷，
  其中术语表构建的分类器曾把「绝对不能归一的角色约定」判成「可脚本批量归一」。

完整改动请见本次发布对应的提交记录。
See the commits associated with this tag for the full change list.
