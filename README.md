# Item Unlocker Challenge

Collect every item! A Minecraft Bedrock add-on that tracks every item a player
unlocks, announces each new unlock, and shows collection progress against a
fixed master list.

- Author: PrimeStrat
- Recommended Version: v1.26.50+

## Commands

All commands are usable by any player.

- `/iuc:progress` - prints your collection progress (global total when the
  Global Counter is on).
- `/iuc:collection [filter]` - opens a paged form listing collected `[X]` and
  uncollected `[ ]` items as body text. The optional `filter` is `all` (default),
  `collected` (only what you have), or `missing` (only what you still need).
- `/iuc:settings` - opens the settings form with three toggles.
- `/iuc:reset` - operators only; opens a warning form and, if confirmed, wipes
  ALL progress for every player and the global collection (offline players are
  reset on their next join).

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

Colored variants count separately. Most (wool, concrete, shulker boxes, bundles,
glazed terracotta, candles, carpets, harnesses, etc.) are already distinct item
ids. Beds and banners share one item id per color in Bedrock, so their color is
read from the item's localization key and each of the 16 colors counts as its
own entry.

Potions are a meta-based exception: they are keyed by their base effect type via
the potion component, ignoring delivery (splash/lingering) and modifier
(amplifier/duration). Speed I, Speed II, and extended Speed are one entry; each
distinct effect (Strength, Night Vision, etc.) is its own entry.

Tipped arrows work the same way: all share the minecraft:arrow id, so their
effect is read from the localization key and each effect (Arrow of Swiftness,
Arrow of Poison, etc.) counts once regardless of amplifier or duration. A plain
arrow is its own single entry.
