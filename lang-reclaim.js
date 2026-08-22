/**
 * crucible-cn —— 把被第三方核心汉化包顶掉的**自家** i18n 键抢回来。
 *
 * ⚠⚠ 先把定性写死：**这是绕过去，不是修好。**
 *   肇事者是 `foundry_chn`（核心简中包，`options.json` 的 `language` 指的就是它）。
 *   它的 `cn.json` 顶层有两个**裸字符串**：
 *       "TOKEN": "指示物"        "WARNING": "警告"
 *   而**同一份文件里没有任何 `TOKEN.` / `WARNING.` 点号键**（实测 0 条；
 *   它的 `CONTROLS` 则是正常的 248 键嵌套对象，`SETTINGS` 也是对象 —— 只有这两个是裸的）。
 *   本文件只把 **crucible-cn 自己 `lang/cn.json` 里的键**抢回来。
 *   **它不修核心自己的 `TOKEN.*` / `WARNING.*`** —— core 的 `lang/en.json` 里这两个本就是
 *   命名空间，同样被这两个裸串打掉了，而且核心那部分里有一段（数据模型字段标签，
 *   `TOKEN.FIELDS.*`）是在 `#localizeDataModels()` 里预取的，**发生在 `i18nInit` 之前**，
 *   本文件这个时机根本够不到。要不要顺带把核心那部分也补回来，是**另一条裁决**，本轮不做。
 *   ⇒ 谁读到这里都别对外宣称「核心的 `WARNING.*` 修好了」。
 *
 * ── 机理（Foundry v14.361 逐行核对，不是转述）─────────────────────────────
 *   client/helpers/localization.mjs:#loadTranslationFile
 *       json = foundry.utils.expandObject(json);          // 每份语言文件先展开点号键
 *   client/helpers/localization.mjs:#getTranslations
 *       // 顺序：核心 lang/<lang>.json（仅 CORE_SUPPORTED_LANGUAGES=["en"]，cn 不走这条）
 *       //     → 系统 → `game.modules.values()` 逐个模块 → 世界
 *       foundry.utils.mergeObject(translations, json, {inplace: true});
 *   common/utils/helpers.mjs:_mergeUpdate
 *       if ( ov && ox && options.recursive ) return mergeObject(...);   // 两侧都是对象才递归
 *       if ( options.overwrite ) original[k] = ...;                     // 否则**整块覆盖**
 *
 *   模块按目录名字母序，`crucible-cn` 排在 `foundry_chn` 之前 ⇒ 我们先把
 *   `TOKEN` / `WARNING` 两个命名空间对象建好，随后 foundry_chn 的裸字符串把它们**整块**换掉。
 *   受害面 = 我们 cn.json 里这两个命名空间下的**全部 42 条**：
 *       TOKEN.LABELS.*    5 条（可视化夹击画在 token 上的那几行字）
 *       TOKEN.MOVEMENT.*  27 条（「强制」以及全部移动方式名：行走/攀爬/飞行/游泳/跳跃/掘穴/坠落/传送…）
 *       WARNING.*         10 条（装备 / 属性 / 技能的报错提示）
 *   失效之后 `localize()` 走 `_fallback`（英文），所以屏幕上看到的是**英文原文**、不是裸键 ——
 *   与 v1.1.25 那次 `EMBER.*` 事故同型，只是这次是**跨模块**。
 *
 * ── 为什么写「顶层扁平点号键」，而不是把命名空间对象重建回去 ───────────────
 *   `common/utils/helpers.mjs:getProperty()` 的第一行是
 *       if ( key in object ) return object[key];
 *   —— **整串点号键在顶层就能命中快路径**。而 `game.i18n.translations` 在 core 里的
 *   消费者只有两处：`localize()`（localization.mjs:436）与 `has()`（:391），
 *   两处都走 `getProperty`。所以写扁平键有两个白拿的好处：
 *     · **一个既有键都不动** —— 不去抢 `TOKEN` / `WARNING` 那两个槽，
 *       foundry_chn 自己那两条翻译原样留着（它们是不是「合法翻译」不该由我们裁）；
 *     · **没被顶掉时天然是 no-op** —— `getProperty` 已经查得到字符串就直接跳过，一次写入都没有。
 *
 * ── 为什么 `enumerable: false` ────────────────────────────────────────────
 *   `client/game.mjs:#hotReloadJSON`（热重载语言文件那条 dev 通道）会
 *       utils.mergeObject(game.i18n.translations, translations);
 *   而 `mergeObject` 在 `_d === 0` 时有这么一步：
 *       if ( Object.keys(original).some(k => k.includes(".")) ) { expandObject(original) … }
 *   如果我们的扁平键是**可枚举**的，这一步会被触发；而 `expandObject` 走到
 *   `setProperty(expanded, "TOKEN.MOVEMENT…", v)` 时 `expanded.TOKEN` 已经是**字符串**
 *   （foundry_chn 那个裸串先插入、位次在前），`target[p] = {}` 在 ESM 的严格模式下
 *   **抛 TypeError**。
 *   非枚举属性不进 `Object.keys` / `Object.entries` ⇒ 那条分支永远不会被触发；
 *   而 `key in object` 对非枚举自有属性照样为真 ⇒ `getProperty` 照样查得到。
 *   ⚠ 这不是推测：离线复刻器 `4-临时脚本/2026-08-22-ui-round3/replay/replicate.mjs`
 *     用**真实的** `mergeObject` 正反两侧实测过（可枚举 → 抛；非枚举 → 不抛且仍查得到）。
 *   ⚠ 代价写明：`Object.keys(game.i18n.translations)` 与 `Object.assign({}, …)` 看不见这些键，
 *     控制台里要用 `game.i18n.translations["TOKEN.MOVEMENT.ACTIONS.walk.label"]` 直接取。
 *
 * ── 时机与取值方式 ────────────────────────────────────────────────────────
 *   挂 `i18nInit`（`localization.mjs:104`，翻译表刚装好、任何运行时取值之前）。
 *   受害的 42 条全是**运行时**才查的（token 上的字、移动方式下拉、`ui.notifications` 报错），
 *   没有一条走 `#localizeDataModels()` 那条预取通道，所以这个时机够。
 *
 *   值**不硬编码**：硬编码一张 42 条的副本等于给自己埋一处必漂的孪生表
 *   （本项目已经因为「两处讲同一件事、改了一边忘了另一边」栽过多次），
 *   而被顶掉之后 `translations` 里已经没有这些值可捞 —— 只能回自己的文件现读。
 *   读法是**同步 XHR**，理由有实测（`4-临时脚本/2026-08-22-ui-round3/tla-probe/RESULT.txt`）：
 *     Chrome 151 里 `<script type="module">` 的 **top-level await 并不推迟 `DOMContentLoaded`**
 *       实测序列：mod:before-await | event:DOMContentLoaded | event:load | mod:after-await
 *     而 `client/client.mjs:686` 正是在 `DOMContentLoaded` 里 `await game.initialize()`，
 *     `i18nInit` 就在 `game.initialize()` 里面
 *     ⇒ 用 `fetch` + `await` 取值**必然赶不上**。同步 XHR 同探针实测
 *       mod2:start | mod2:sync-xhr status=200 | mod2:end | event:DOMContentLoaded —— 赶得上。
 *   文件路径不写死，从 `module.json` 声明的 `languages` 里现取，改声明就自动跟着走。
 *
 * ── 扫描面 ────────────────────────────────────────────────────────────────
 *   刻意**扫我们 cn.json 的全部键**，而不是只扫 `TOKEN.` / `WARNING.` 两个前缀：
 *   写入条件是「这条键当前查不到任何字符串」，本身就是零误伤的，
 *   于是哪天再有别的包用同样的手法顶掉别的命名空间，这里不改一个字也能兜住。
 *   今天实际命中的就是那 42 条（离线复刻器逐键断言过）。
 */

/** 我们自己的模块 id / 语言 —— 只用来在 `game.modules` 里定位自家的语言文件声明。 */
const MODULE_ID = 'crucible-cn';
const LANG = 'cn';

/**
 * 从 `module.json` 声明里取自家该语言的文件路径（相对模块根）。
 * @returns {string|null}
 */
function ownLanguagePath(moduleId = MODULE_ID, lang = LANG) {
  const pkg = game.modules.get(moduleId);
  // v14 的 `languages` 是 SetField（`#discoverSupportedLanguages` 用 `.size` 迭代），
  // 而 `#filterLanguagePaths` 又对它 `.reduce` —— 两种形态都接住，别挑食。
  const entries = Array.from(pkg?.languages ?? []);
  const entry = entries.find((l) => l?.lang === lang);
  return entry?.path ?? null;
}

/**
 * 同步读回自家的扁平点号键翻译表。失败一律返回 `null`（调用方当没这回事，绝不影响开世界）。
 * @returns {Record<string, string>|null}
 */
/**
 * **纯函数**：把 `languages[].path` 归一成「从数据根算起」的相对路径。
 *
 * ⚠⚠ 0.9.16 在这里栽过一次，值得把成因写死：**已安装**的包上，`languages[].path`
 *   在运行时**已经是** `modules/<id>/lang/cn.json`，不是清单里写的 `lang/cn.json`。
 *   成因在 Foundry 服务端（`dist/packages/package.mjs`）：
 *       const a = e.languages.element;  a.fields.path = new PackageAssetField;
 *   而 `PackageAssetField.initialize()` 对 `installed` 的包会把值解析成 **clientPath**
 *   （`relativeToPackage` 默认为真 ⇒ 前缀 `modules/<id>`）；只有**未安装**（远端 manifest
 *   读出来的）包才原样返回清单里的写法。这也正是 core 自己 `#filterLanguagePaths` 能把
 *   `l.path` 直接交给 `#loadTranslationFile(path)` 的原因。
 *   我当初拿清单里的形状去拼，于是拼出了 `/modules/crucible-cn/modules/crucible-cn/lang/cn.json`
 *   —— 404、抢回器整段没跑，而屏幕上只是英文、控制台只有一条 warn。
 *
 * ⇒ 两种形态都接住，不挑食（与上面 `languages` 那处同一个原则）。
 * @param {string} p            `languages[].path` 的值
 * @param {string} [moduleId]
 * @returns {string}            形如 `modules/crucible-cn/lang/cn.json`
 */
export function toClientPath(p, moduleId = MODULE_ID) {
  const prefix = `modules/${moduleId}/`;
  const clean = String(p).replace(/^\/+/, '');
  return clean.startsWith(prefix) ? clean : `${prefix}${clean}`;
}

/**
 * 同步读回自家的扁平点号键翻译表。失败一律返回 `null`（调用方当没这回事，绝不影响开世界）。
 * @param {(p: string) => string} [getRoute]  注入点：离线验要能不启动 Foundry 就跑它
 * @param {() => XMLHttpRequest} [makeXhr]    同上
 * @returns {Record<string, string>|null}
 */
function loadOwnTranslationsSync(getRoute = foundry.utils.getRoute,
                                 makeXhr = () => new XMLHttpRequest()) {
  const declared = ownLanguagePath();
  if (!declared) return null;
  const url = getRoute(toClientPath(declared));
  const xhr = makeXhr();
  xhr.open('GET', url, false); // 同步：理由见文件头「时机与取值方式」
  xhr.send(null);
  // 报错里**两个**都带上：只报最终 URL 的话，下次形状再变还得再猜一轮。
  if (xhr.status !== 200) {
    throw new Error(`HTTP ${xhr.status} for ${url}（languages[].path 声明为 ${declared}）`);
  }
  const json = JSON.parse(xhr.responseText);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(`${url} 不是一个对象`);
  }
  return json;
}

/**
 * **纯函数**：把 `table` 里当前查不到的键，以顶层扁平点号键的形式写回 `translations`。
 *
 * ⚠ 抽成不依赖任何 Foundry 全局的纯函数**不是为了好看**：离线复刻器要能直接 import 它，
 *   用**真实的** `foundry.utils.getProperty` 与真实的合并结果跑正反两侧。
 *   本文件里凡是碰 `game` / `Hooks` / `XMLHttpRequest` 的，都在这个函数**外面**。
 *
 * 写入条件（三选一，只有第一种写）：
 *   · `getProperty(translations, key)` 是 `undefined` → **写**（缺失，或祖先被非对象顶掉）；
 *   · 已经是字符串 → **跳过**。可能是我们自己（没被顶掉 ⇒ no-op），
 *     也可能是别的模块**合法**改写了这条键 —— 那也不该由我们抢回来；
 *   · 是对象 → **跳过**。说明那个位置是别人的命名空间，写扁平键会把它遮住。
 *
 * ⇒ 幂等：第二次跑时全部落进「已经是字符串」，写入 0 次。
 *
 * @param {Record<string, unknown>} translations  `game.i18n.translations`
 * @param {Record<string, string>} table          我们自己的扁平点号键表
 * @param {(object: object, key: string) => unknown} getProperty  core 的 `foundry.utils.getProperty`
 * @returns {{reclaimed: string[], alreadyString: string[], skippedObject: string[], skippedBadValue: string[]}}
 */
export function reclaimTranslations(translations, table, getProperty) {
  const report = { reclaimed: [], alreadyString: [], skippedObject: [], skippedBadValue: [] };
  for (const [key, value] of Object.entries(table)) {
    if (typeof value !== 'string') {
      // 我们的 cn.json 必须是「顶层值全为字符串」（判据 `R-lang-flat-keys` 盯着这一条）。
      // 真出现非字符串就记账、跳过，绝不往 translations 里塞对象 —— 那正是 v1.1.25 的死法。
      report.skippedBadValue.push(key);
      continue;
    }
    const current = getProperty(translations, key);
    if (typeof current === 'string') { report.alreadyString.push(key); continue; }
    if (current !== undefined) { report.skippedObject.push(key); continue; }
    Object.defineProperty(translations, key, {
      value,
      writable: true,
      enumerable: false, // 理由见文件头「为什么 enumerable: false」
      configurable: true,
    });
    report.reclaimed.push(key);
  }
  return report;
}

/**
 * 本次开世界里抢回器**实际发生了什么**，给自检面板读。
 *
 * ⚠⚠ 为什么必须留这份账：抢回是**静默**的 —— 成功了屏幕上就是正常中文，
 *   没被顶掉时同样是正常中文，**两种情况长得一模一样**。而它失败时（比如上游改了
 *   `getRoute` 的形状、或 XHR 被拦）屏幕上是英文 fallback，**也不报错**。
 *   面板要能替人区分「没被顶」「顶了但抢回来了」「抢回器根本没跑」这三态，
 *   就只能由这里如实记账。这正是本项目「0 个问题 ≠ 没查到东西」那条原则的同一形态。
 *
 * `phase` 的四个值：
 *   · `pending`  —— 模块装了，但 `i18nInit` 还没到（面板不该看到这个值）
 *   · `done`     —— 跑完了，`report` 有效
 *   · `no-table` —— `module.json` 里找不到自家语言文件声明，没得抢（不算错，但要说出来）
 *   · `error`    —— 抛了，`error` 里是消息。屏幕上会是英文 fallback
 * @type {{phase: string, error: string|null, report: object|null, tableSize: number}}
 */
const RECLAIM_STATE = { phase: 'pending', error: null, report: null, tableSize: 0 };

/**
 * 只读快照。返回**拷贝**，免得面板那边不小心改到账本。
 * @returns {{phase: string, error: string|null, report: object|null, tableSize: number}}
 */
export function getReclaimState() {
  return {
    phase: RECLAIM_STATE.phase,
    error: RECLAIM_STATE.error,
    tableSize: RECLAIM_STATE.tableSize,
    report: RECLAIM_STATE.report && {
      reclaimed: [...RECLAIM_STATE.report.reclaimed],
      alreadyString: [...RECLAIM_STATE.report.alreadyString],
      skippedObject: [...RECLAIM_STATE.report.skippedObject],
      skippedBadValue: [...RECLAIM_STATE.report.skippedBadValue],
    },
  };
}

/**
 * 挂钩。放在单独的导出函数里，是为了让本文件在**没有 Foundry 全局**的 Node 里也能被 import
 * （离线复刻器就是这么用的）—— 模块顶层一行副作用都没有。
 */
export function registerLangReclaim() {
  Hooks.once('i18nInit', () => {
    try {
      const table = loadOwnTranslationsSync();
      if (!table) { RECLAIM_STATE.phase = 'no-table'; return; }
      RECLAIM_STATE.tableSize = Object.keys(table).length;
      const report = reclaimTranslations(game.i18n.translations, table, foundry.utils.getProperty);
      RECLAIM_STATE.report = report;
      RECLAIM_STATE.phase = 'done';
      if (report.reclaimed.length) {
        console.warn(
          `Crucible cn | 有 ${report.reclaimed.length} 条自家译文被别的语言包顶掉了，已就地抢回：`,
          report.reclaimed,
        );
      }
      if (report.skippedObject.length || report.skippedBadValue.length) {
        console.warn('Crucible cn | 抢回时跳过了这些键（位置被命名空间占用 / 值不是字符串）：', {
          skippedObject: report.skippedObject,
          skippedBadValue: report.skippedBadValue,
        });
      }
    } catch (err) {
      RECLAIM_STATE.phase = 'error';
      RECLAIM_STATE.error = err?.message ?? String(err);
      console.warn('Crucible cn | 译文抢回未生效（汉化其余部分不受影响）：', err);
    }
    // 账本挂到自家模块的 `api` 上给自检面板读。**不用 globalThis** —— 那是全局命名空间，
    // 而 `game.modules.get(id).api` 是 Foundry 自己的约定，别的模块想读也知道去哪儿找。
    // 放在 try 之外：抛了也要挂，不然面板分不清「抢回器出错」与「crucible-cn 没装」。
    try {
      const pkg = game.modules.get(MODULE_ID);
      if (pkg) {
        pkg.api ??= {};
        pkg.api.getReclaimState = getReclaimState;
      }
    } catch { /* 挂不上就算了，抢回本身已经生效，不值得为记账影响开世界 */ }
  });
}
