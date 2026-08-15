/**
 * crucible-cn 的自检面板入口。
 *
 * ⚠ **为什么这里也要有一份**：面板的主体 `cn-selfcheck.mjs` 与
 * `ember_cn_unofficial/scripts/ember-cn-selfcheck.mjs` 是**同一份文件**。
 * 之所以复制而不是跨模块 import，是因为只装 crucible-cn、不装 ember 汉化的用户
 * 那边根本没有那个文件 —— 跨模块 import 会直接 404，面板等于不存在。
 *
 * ⚠ **两份必须逐字节相同**，改一处要同步另一处。这一条由仓库侧的断言
 * `R-selfcheck-twin` 机械看住，不靠人记（本项目吃过太多次「两处讲同一件事、
 * 改了一边忘了另一边」的亏）。
 *
 * ⚠ 与 ember 侧的唯一区别：这里**不传** `extra` ——
 * crucible-cn 没有硬编码字符串表，所以「D 键活性」那一档会如实报
 * **「无从查起」**，而不是伪装成通过。装了 ember 汉化时由那边负责这一档。
 */
import * as SELFCHECK from "./cn-selfcheck.mjs";

Hooks.once("init", () => {
  // 装了 ember 汉化就让那边注册，避免设置面板里出现两个同样的入口。
  if (game.modules.get("ember_cn_unofficial")?.active) return;
  try {
    SELFCHECK.registerSelfCheck(null, { modId: "crucible-cn" });
  } catch (err) {
    console.error("[crucible-cn] 自检面板注册失败（汉化本身不受影响）：", err);
  }
});
