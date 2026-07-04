# Item Unlocker Challenge

Collect every item! A Minecraft Bedrock add-on that tracks every item a player
unlocks, announces each new unlock, and shows collection progress against a
fixed master list.

- Author: PrimeStrat
- Target: Bedrock 1.21.120+, `@minecraft/server` 2.8.0, `@minecraft/server-ui` 2.1.0

## Packs

- `item_unlocker_bp/` - behavior pack (scripts + data)
- `item_unlocker_rp/` - resource pack (name/description text + icon)

Both must be applied to a world together (they depend on each other).

## Commands

All commands are usable by any player.

- `/iuc:progress` - prints your collection progress (e.g. `5 / 1363`).
- `/iuc:collection` - opens a paged form listing every collected `[X]` and
  uncollected `[ ]` item as body text.
- `/iuc:settings` - opens the settings form with three toggles.

## Settings

- Global Counter (default off) - when off, progress is tracked per player. When
  on, the tracker displays the shared progress of all contributing players.
- Disable Unlock Sound - suppress the `random.orb` sound on unlock.
- Disable Unlock Message - suppress the chat message on unlock.

By default every new unlock broadcasts a chat message and plays `random.orb`.

## What counts as one collectible

Collection is keyed by item type id, so item meta is ignored:

- Durability, enchantments, and enchanted books (all one `enchanted_book`).
- Dyed leather armor (armor dyes do not create new entries).
- Flavor text / custom names (e.g. every Goat Horn is one entry).
- Buckets of a mob (axolotl, tropical fish, etc.) count as their single item id.
- Damaged and chipped anvils collapse onto the base anvil.

Colored variants that are distinct item ids DO count separately (wool, concrete,
shulker boxes, bundles, glazed terracotta, candles, carpets, harnesses, etc.).
Beds and banners are a single item id in Bedrock (color is item meta), so each
is one entry.

Potions are the one meta-based exception: they are keyed by their base effect
type via the potion component, ignoring delivery (splash/lingering) and
modifier (amplifier/duration). Speed I, Speed II, and extended Speed are one
entry; each distinct effect (Strength, Night Vision, etc.) is its own entry.

## The fixed master list

`item_unlocker_bp/scripts/collectibles.js` holds the fixed set of collectible
keys (the denominator, currently 1363). It is generated from the source item
list; Java-exclusive and unobtainable entries are dropped. To regenerate it:

```
node claude_tools/build_collectibles.js
```

## Storage

Per-player and global progress are stored in dynamic properties. To stay under
the 32,767-byte-per-property limit, keys are sharded across 16 properties
(`iuc:pc0`..`iuc:pc15` per player, `iuc:gc0`..`iuc:gc15` global). In-memory
caches keep the acquisition hot path off native reads.
