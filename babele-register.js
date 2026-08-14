/**
 * crucible-cn — Babele registration.
 *
 * Requires Babele >= 2.9.1.
 *
 * What changed from the 0.8.x registration, and why:
 *
 *  - Registration moved from Foundry's `init` hook to Babele's own
 *    `babele.init`. Babele sets `game.babele` inside its `init` handler and
 *    then fires `babele.init` synchronously; registering from a sibling `init`
 *    handler only worked because module load order happened to put babele
 *    first. `babele.init` is the documented, order-independent hook.
 *
 *  - The `SUPPORTED_PACKS` / `DEFAULT_MAPPINGS.ActiveEffect` monkey-patch is
 *    gone. Babele 2.9.1 supports ActiveEffect natively (and adds a `structured`
 *    converter for effect `changes`), so the patch was dead code.
 *
 *  - `actions_converter` no longer reaches back into
 *    `game.babele.converters.actions_converter(...)`. In 2.9.1 the `.converters`
 *    getter returns FunctionalConverter OBJECTS, not raw functions, so that call
 *    threw a TypeError for every adventure-embedded item that had actions.
 *    Embedded items now go through Babele's own recursive `document` converter,
 *    which additionally resolves each item against its ORIGINAL compendium's
 *    translation via `_stats.compendiumSource`.
 *
 *  - Per-pack `mapping` blocks were removed from `compendium/cn/*.json` in
 *    favour of one global `registerMapping()` layer. Compendium-local mappings
 *    outrank registered ones, so leaving them would have silently overridden
 *    this file.
 *
 * The mapping layer and converters are generated — see babele-mappings.js.
 */
import { DOCUMENT_MAPPINGS, PROJECT_CONVERTERS } from './babele-mappings.js';

Hooks.once('babele.init', (babele) => {
  if (!game.modules.get('babele')?.active) return;

  babele.register({
    module: 'crucible-cn',
    lang: 'cn',
    dir: 'compendium/cn',
  });

  babele.registerConverters(PROJECT_CONVERTERS);
  babele.registerMapping(DOCUMENT_MAPPINGS);

  console.log('Crucible cn | 已注册 Babele 翻译源与文档映射');
});

/**
 * `[[/talent …]]` 增强器的 `Talent: ` 前缀 —— Crucible 自己漏掉的一处 i18n。
 *
 * `module/enrichers.mjs:739` 写的是
 *   tag.innerHTML = `Talent: ${talentIndex.name}`;
 * 而**紧邻的两个同类增强器**用的都是 i18n 键：
 *   :722 enrichKnowledge -> _loc("ACTOR.KnowledgeSpecific")   // 知识：{knowledge}
 *   :757 enrichLanguage  -> _loc("ACTOR.LanguageSpecific")    // 语言：{language}
 * 只有 talent 这一条把前缀写死了 —— 是上游自己的不一致，不是配置问题。
 *
 * 两条汉化通道都够不到：Babele 只管合集文档（`talentIndex.name` 确实已经是中文，
 * 所以玩家看到的是「Talent: 识别法术」这种半英半中）；i18n 那边**根本没有键可翻**。
 * 只能在运行时包一层增强器。
 *
 * 为什么放在 crucible-cn 而不是 ember 侧：这个串是 **Crucible 系统**产的，
 * 纯 Crucible 世界（没装 Ember）照样会露；放这里两种世界都覆盖到。
 * 计数：`ember.crucible-adventure` 68 处、dnd5e 孪生包 67 处。
 *
 * 做法刻意保守：
 *  - 按 `id === "crucibleTalent"` **精确定位**（上游给每个增强器都写了 id），
 *    不用正则去猜哪个增强器是谁的；
 *  - 只在结果确实以 `Talent: ` 开头时改，且只动前缀，`talentIndex.name` 原样保留；
 *  - `dataset.talentUuid` / class / `dataset.crucibleTooltip` 一概不碰 ——
 *    点击与悬浮逻辑全靠它们；
 *  - 包在 try/catch 里，失败只留一条警告，绝不影响开世界。
 *
 * 时机：`registerEnrichers()` 在 Crucible 自己的 `Hooks.once("init")` 里跑
 * （crucible-compiled.mjs:47439），所以补丁挂 `setup`（i18nInit 早于 init，太早）。
 * 返回值改成 async 是安全的：Foundry v14
 * `client/applications/ux/text-editor.mjs:267` 就是 `await enricher(match, options)`。
 */
const TALENT_PREFIX_EN = 'Talent: ';
const TALENT_PREFIX_CN = '天赋：';

function patchTalentEnricher() {
  const enrichers = CONFIG.TextEditor?.enrichers;
  if (!Array.isArray(enrichers)) return;

  const entry = enrichers.find((e) => e?.id === 'crucibleTalent');
  if (!entry || typeof entry.enricher !== 'function' || entry.__crucibleCnWrapped) return;

  const original = entry.enricher;
  entry.enricher = async function wrappedTalentEnricher(...args) {
    const result = await original.apply(this, args);
    try {
      const text = result instanceof HTMLElement ? result.textContent : null;
      if (typeof text === 'string' && text.startsWith(TALENT_PREFIX_EN)) {
        result.textContent = TALENT_PREFIX_CN + text.slice(TALENT_PREFIX_EN.length);
      }
    } catch (err) {
      console.warn('Crucible cn | 天赋增强器前缀改写失败：', err);
    }
    return result;
  };
  entry.__crucibleCnWrapped = true;
}

Hooks.once('setup', () => {
  try {
    patchTalentEnricher();
  } catch (err) {
    console.warn('Crucible cn | 天赋增强器补丁未生效：', err);
  }
});

/**
 * 恩惠 / 祸骰明细的 `label` 槽里有 **7 个裸英文串**走 `{{localize}}` 却没有 i18n 键。
 *
 * 写点（crucible 0.10.1，逐行核对过）：
 *   module/documents/combatant.mjs:27  {label: "Reserved Action"}
 *   module/documents/combatant.mjs:29  {label: "Slow Weaponry"}
 *   module/documents/combatant.mjs:30  {label: "Broken"}
 *   module/documents/combatant.mjs:31  {label: "Bulky Armor"}
 *   module/documents/combatant.mjs:36  {label: "Elite"}
 *   module/documents/combatant.mjs:37  {label: "Boss"}
 *   module/dice/standard-check-dialog.mjs:500 · module/dice/standard-check.mjs:189/:192 ·
 *   module/documents/actor.mjs:578/:579      {label: "Special"}   （共 5 个写点）
 * 渲染点：templates/dice/partials/standard-check-details.hbs:6/:19 的
 *   `{{localize boon.label}}` / `{{localize bane.label}}`
 * 该 partial 被掷骰对话框、检定聊天卡的骰子明细、动作使用页脚、危害对话框四处 include，
 * 所以**每一次检定**都会走到；combatant 那六条出现在先攻明细里，每场战斗开场就露。
 *
 * 上游同一个 `label` 槽的另外 ~37 个赋值点写的全是正规 i18n 键
 * （`ACTION.TAG.Difficult`…）或已本地化的文档名 —— 最直接的铁证是 **broken 被写了两遍**：
 * `actor.mjs:383` 用 `statuses.broken.name`（正确），`combatant.mjs:30` 却写死 `"Broken"`。
 *
 * 为什么本项目此前看不见：lang 的覆盖模型是「按 en.json 键清单逐键翻」，这 7 条
 * **不在 en.json 里**，于是「cn 键数 == en 键数」这个绿灯永远不会亮红。
 * 注意 crucible lang/en.json 里那个 `"Special"` 是**嵌套在分节对象里**的，
 * 而 `localize()` 走 `getProperty(translations, "Special")` 是顶层查找，查不到。
 *
 * 为什么写在这里而不是 `lang/cn.json`：这 7 个是**无点号的顶层键**，塞进 cn.json 会
 * 打破发版前 `flatten_lang.py` 的「拍平前 == 拍平后 == 英文键数」三数相等（现为 1842），
 * 而它们本来就不属于 en.json 的键空间。
 *
 * 越界风险已实测：扫过 Foundry v14 本体 + 本机全部 systems/modules 的 101 个 lang 文件与
 * 3308 个 js/mjs/hbs/html，这 7 个串**既没有任何包把它们当顶层键定义过，也没有任何
 * `localize("…")` 字面调用** —— 冲突面为 0。即便如此仍加了「已存在就不覆盖」的守卫。
 *
 * 译名一律取本仓 lang/cn.json 里同概念的既有译法，不另起炉灶：
 *   Special ← ACTION.TAG_CATEGORIES.Special「特殊」
 *   Broken  ← ACTIVE_EFFECT.STATUSES.Broken「破碎」（必须与 actor.mjs:383 那条同名）
 *   Elite / Boss ← ACTOR.ADVERSARY.THREAT_RANKS.*「精英」「首领」
 *   Bulky Armor ← ARMOR.PROPERTIES.Bulky「笨重」＋ DEFENSES.Armor「护甲」
 *   Slow Weaponry：上游取的是 `weapons.slow`＝装备了 Oversized 武器（actor-base.mjs:736），
 *                  显示串是 "Slow Weaponry"，故译「迟缓武器」
 *   Reserved Action ← RESOURCES.Action「动作」，指回合结束时未花掉的动作点
 */
const BOON_BANE_LABELS = {
  'Special': '特殊',
  'Reserved Action': '保留动作',
  'Slow Weaponry': '迟缓武器',
  'Broken': '破碎',
  'Bulky Armor': '笨重护甲',
  'Elite': '精英',
  'Boss': '首领',
};

/**
 * 同一通道的第二张表：动作标签组 tooltip、设置窗提交按钮、下拉首行。
 *
 * ① 动作标签组 tooltip 的 5 个裸串（crucible 0.10.1，逐行核对）：
 *      crucible-compiled.mjs:3877  {label: "Spell Tags"}   （module/const/action.mjs:534）
 *      crucible-compiled.mjs:4093  {label: "Strikes"}      （module/const/action.mjs:750）
 *      crucible-compiled.mjs:4368  {label: "Reload"}       （module/const/action.mjs:1025）
 *      crucible-compiled.mjs:4726  {label: "Skill Tags"}   （module/const/action.mjs:1383）
 *      crucible-compiled.mjs:9920 / :11007 {label: "Weapon Tags"}（module/hooks/action.mjs:1265/:2352）
 *    这 5 个都汇进 crucible-compiled.mjs:21102
 *      `tags.context = new ActionTagGroup({…, tooltip: ctx.label || _loc("ACTION.TAGS.Context")})`
 *    —— **同一行的兜底值用的是正规 i18n 键**（本仓已译「上下文标签」），可见上游本意就是放键，
 *    只是这 5 个写点漏了。渲染点 templates/dice/partials/action-use-header.hbs:22
 *      `data-tooltip="{{tags.context.tooltip}}"`
 *    该 partial 被 action-use-chat / action-use-dialog / spell-cast-dialog / hazard-dialog
 *    四个模板 include，所以每次动作使用的对话框与聊天卡都带。
 *    悬浮时 core client/helpers/interaction/tooltip-manager.mjs:263
 *      `if ( game.i18n.has(text) ) this.tooltip.innerHTML = _loc(text);`
 *    —— 顶层键存在 has() 即为真，故这条通道确实修得了。
 *
 * ② `Save Changes`：crucible-compiled.mjs:14413（源码 module/applications/settings/
 *    compendium-sources.mjs:58）`context.buttons = [{type:"submit", …, label:"Save Changes"}]`，
 *    页脚走 core templates/generic/form-footer.hbs 的 `{{localize button.label}}`。
 *    注意：本机 modules/foundry_chn/cn.json 顶层**已经**有 `"Save Changes": "保存更改"`，
 *    但 crucible-cn 不依赖 foundry_chn（module.json 的 requires 只有 babele），
 *    所以这里补一条同值的兜底；装了 foundry_chn 的世界由下面的守卫自动让位。
 *    同串还出现在 core client/applications/settings/menus/av-config.mjs:156、
 *    dnd5e.mjs:48521、ember.mjs:51613 与 ember templates/applications/actor-flags.hbs:52，
 *    译文与 ember 侧 EXACT 表的「保存更改」一致，不会产生分歧。
 *
 * ③ `'-- None -- '`：crucible-compiled.mjs:47533 `}, {"": "-- None -- "})` —— crucible 的
 *    "party" 世界设置用 ForeignDocumentField 的 choices 首行。渲染链
 *    templates/settings/config-category.hbs 传 `localize=true`
 *    → client/applications/forms/fields.mjs:313 `if ( config.localize ) label = _loc(label)`。
 *    **尾随空格必须原样保留**：localize 走 getProperty，
 *    common/utils/helpers.mjs:824 的 `if ( key in object )` 快路径按整串比对，少一个空格就不命中。
 *
 * 越界检查（本轮重跑，不是引用旧结论）：扫本机 Foundry v14 本体 + Data/{modules,systems}
 * 的 161 个 lang json，这 7 个串里只有 `Save Changes` 被 foundry_chn 定义过（值同为「保存更改」）；
 * 扫 3212 个 js/mjs/hbs/html 找字面 `localize("…")` / `{{localize "…"}}` / `label: "…"`，
 * 非 crucible 的命中只有 `Reload` 三处，逐个看过都不经 i18n：
 *   archive-of-voices-pro v12/v13 avp-settings.js 是 DialogV1 的按钮，
 *     core templates/hud/dialog.html 写的是 `{{{button.label}}}`（无 localize），
 *   stylish-shop pf2e/index.js:209 的 label 只进 `.sort()` 比较，从不上屏 i18n。
 * 即便如此仍走「已存在就不覆盖」的同一条守卫。
 *
 * 译名取本仓 lang/cn.json 同概念既有译法：
 *   Spell/Skill/Weapon Tags ← ACTION.TAGS.Action「动作标签」ACTION.TAGS.Target「目标标签」的构词
 *   Strikes ← ACTION.DEFAULT_ACTIONS.Strike.Name「打击」
 *   Reload  ← ACTION.TAG.Reload「装填」
 */
const EXTRA_TOPLEVEL_LABELS = {
  'Spell Tags': '法术标签',
  'Skill Tags': '技能标签',
  'Weapon Tags': '武器标签',
  'Strikes': '打击',
  'Reload': '装填',
  'Save Changes': '保存更改',
  '-- None -- ': '—— 无 ——',
};

Hooks.once('i18nInit', () => {
  for (const table of [BOON_BANE_LABELS, EXTRA_TOPLEVEL_LABELS]) {
    for (const [key, value] of Object.entries(table)) {
      // 顶层键是全局的：别人已经定义过就让给别人，宁可露英文也不顶掉。
      if (typeof game.i18n.translations[key] === 'string') continue;
      game.i18n.translations[key] = value;
    }
  }
});

/**
 * `CrucibleItem.validateJoint()` 抛的 5 条词缀校验错误是**裸英文**，且必然上屏。
 *
 * 写点（crucible 0.10.1 module/documents/item.mjs，编译产物 crucible-compiled.mjs 同串）：
 *   :129 / :7799  "Unique items cannot be enchanted with affixes."
 *   :141 / :7811  `Duplicate affix identifier "${affix.identifier}".`
 *   :145 / :7815  `Affix "${affix.identifier}" cannot be applied to item type "${data.type}".`
 *   :151 / :7821  `Prefix affixes (cost ${prefixSpent}) exceed the available prefix capacity of ${halfCapacity}.`
 *   :154 / :7824  `Suffix affixes (cost ${suffixSpent}) exceed the available suffix capacity of ${halfCapacity}.`
 * 捞起点：module/documents/active-effect.mjs:186 与 :224 都是
 *   `catch(err) { ui.notifications.warn(err.message); return false; }`
 * core client/applications/ui/notifications.mjs:121 `message = _loc(message, format);` 无条件走一遍
 * i18n，但这 5 条谁都没注册键。crucible.affixes.json 已译 135 条词缀，每次拖放失败都会弹。
 *
 * 为什么不用上面那张顶层键表：只有第一条是定串，另外 4 条带插值，加键救不了。
 * 为什么不去包 `ui.notifications.warn`：那是全客户端共享的出口，任何模块的提示都要过我们一手，
 * 代价远大于收益。这里改为**只包 `CONFIG.Item.documentClass.validateJoint`**——
 * crucible-compiled.mjs:47343 `CONFIG.Item.documentClass = CrucibleItem;` 与 item.mjs:98 的
 * `static validateJoint` 是同一个对象，赋值即命中 active-effect.mjs 里 `CrucibleItem.validateJoint(...)`
 * 那两个调用点，作用面仅限 Crucible 物品校验。
 *
 * 保守做法（与上面天赋增强器补丁同款）：
 *  - 幂等标记 `__crucibleCnAffixMsgWrapped`，重复 setup 不会套娃；
 *  - 只在消息**整串**匹配这 5 条正则时改写，其余一律 `throw err` 原样透传；
 *  - 改写出的 Error 挂 `cause` 保留原始对象，方便排错；
 *  - 整体裹 try/catch，翻译逻辑自身出错也绝不吞掉原始异常。
 * 注意上游第 4/5 条里「Prefix」首字母大写、后半句「prefix」小写，不能用反向引用 `\1` 去凑。
 * 译名取本仓 lang/cn.json：affix 词缀（AFFIX.*）、prefix/suffix 前缀/后缀（AFFIX.TypePrefix/TypeSuffix）、
 * identifier 标识符（AFFIX.FIELDS.identifier.label）、item type 物品类型（AFFIX.FIELDS.itemTypes.label）、
 * unique 独特（ITEM.PROPERTIES.Unique，且与 ITEM.SHEET.UniqueItemNoAffixes 的措辞对齐）、
 * capacity 容量（AFFIX.FIELDS.tier.hint「消耗一点前缀或后缀容量」）。
 */
const AFFIX_ERROR_RULES = [
  [/^Unique items cannot be enchanted with affixes\.$/,
    () => '独特物品无法附加词缀进行附魔。'],
  [/^Duplicate affix identifier "(.+)"\.$/,
    (m) => `词缀标识符「${m[1]}」重复。`],
  [/^Affix "(.+)" cannot be applied to item type "(.+)"\.$/,
    (m) => `词缀「${m[1]}」无法应用于物品类型「${m[2]}」。`],
  [/^Prefix affixes \(cost ([\d.]+)\) exceed the available prefix capacity of ([\d.]+)\.$/,
    (m) => `前缀词缀（消耗 ${m[1]}）超出可用的前缀容量 ${m[2]}。`],
  [/^Suffix affixes \(cost ([\d.]+)\) exceed the available suffix capacity of ([\d.]+)\.$/,
    (m) => `后缀词缀（消耗 ${m[1]}）超出可用的后缀容量 ${m[2]}。`],
];

export function translateAffixError(message) {
  if (typeof message !== 'string') return null;
  for (const [pattern, render] of AFFIX_ERROR_RULES) {
    const m = pattern.exec(message);
    if (m) return render(m);
  }
  return null;
}

function patchAffixValidationMessages() {
  const ItemCls = CONFIG.Item?.documentClass;
  if (!ItemCls || typeof ItemCls.validateJoint !== 'function') return;
  if (ItemCls.__crucibleCnAffixMsgWrapped) return;

  const original = ItemCls.validateJoint;
  ItemCls.validateJoint = function wrappedValidateJoint(...args) {
    try {
      return original.apply(this, args);
    } catch (err) {
      let cn = null;
      try {
        cn = translateAffixError(err?.message);
      } catch (inner) {
        console.warn('Crucible cn | 词缀校验错误翻译失败：', inner);
      }
      if (!cn) throw err;
      throw new Error(cn, { cause: err });
    }
  };
  ItemCls.__crucibleCnAffixMsgWrapped = true;
}

Hooks.once('setup', () => {
  try {
    patchAffixValidationMessages();
  } catch (err) {
    console.warn('Crucible cn | 词缀校验错误翻译补丁未生效：', err);
  }
});
