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
 * Foundry's core `Sort` label collides with Crucible's own use of the key.
 *
 * The previous version set the lowercase key to "tri" — French, copy-pasted
 * from the Crucible-FR module and never localised. Fixed here.
 */
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
 * 而它们本来就不属于 en.json 的键空间。`Sort` 那两条也是同一理由写在这里的。
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

Hooks.once('i18nInit', () => {
  game.i18n.translations.Sort = 'Sort';
  game.i18n.translations.sort = '排序';

  for (const [key, value] of Object.entries(BOON_BANE_LABELS)) {
    // 顶层键是全局的：别人已经定义过就让给别人，宁可露英文也不顶掉。
    if (typeof game.i18n.translations[key] === 'string') continue;
    game.i18n.translations[key] = value;
  }
});
