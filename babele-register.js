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
 * Foundry's core `Sort` label collides with Crucible's own use of the key.
 *
 * The previous version set the lowercase key to "tri" — French, copy-pasted
 * from the Crucible-FR module and never localised. Fixed here.
 */
Hooks.once('i18nInit', () => {
  game.i18n.translations.Sort = 'Sort';
  game.i18n.translations.sort = '排序';
});
