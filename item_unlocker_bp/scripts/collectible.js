import { ItemComponentTypes } from "@minecraft/server";

const POTION_KEY_PREFIX = "potion:";

const ANVIL_COLLAPSE = {
    "minecraft:chipped_anvil": "minecraft:anvil",
    "minecraft:damaged_anvil": "minecraft:anvil"
};

/**
 * Reduces a potion effect id to its base family key.
 * The raw id carries a namespace and duration/amplifier prefixes
 * (long_, strong_) that must be dropped so Speed I, Speed II, and
 * extended Speed all resolve to the same potion slot.
 * @param {string} effectId Raw potionEffectType id (e.g. minecraft:long_swiftness).
 * @returns {string} A base potion key (e.g. potion:swiftness).
 */
function potionKey(effectId) {
    const colon = effectId.indexOf(":");
    let base = colon === -1 ? effectId : effectId.slice(colon + 1);
    base = base.replace(/^long_/, "").replace(/^strong_/, "");
    return POTION_KEY_PREFIX + base;
}

/**
 * Resolves the collectible key for an item stack.
 * Everything is tracked by its item type id, so meta such as durability,
 * enchantments, dye color, and flavor text collapse to a single entry.
 * Potions are the one exception: they all share the minecraft:potion type id,
 * so they are keyed by their base effect type, ignoring delivery
 * (splash/lingering) and modifier (amplifier/duration). Damaged anvil
 * variants collapse back onto the base anvil.
 * @param {import("@minecraft/server").ItemStack} itemStack Stack that entered an inventory.
 * @returns {string} The stable collectible key for this stack.
 */
export function collectibleKey(itemStack) {
    const potion = itemStack.getComponent(ItemComponentTypes.Potion);
    if (potion) {
        return potionKey(potion.potionEffectType.id);
    }
    const typeId = itemStack.typeId;
    if (ANVIL_COLLAPSE[typeId]) {
        return ANVIL_COLLAPSE[typeId];
    }
    return typeId;
}

/**
 * Converts a raw id segment into a spaced, title-cased display string.
 * @param {string} segment Underscore-separated id segment.
 * @returns {string} A human-readable label.
 */
function prettifySegment(segment) {
    const words = segment.split("_");
    const shaped = [];
    for (const word of words) {
        if (word.length === 0) {
            continue;
        }
        shaped.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
    return shaped.join(" ");
}

/**
 * Produces a readable display name for a collectible key.
 * @param {string} key Collectible key from collectibleKey.
 * @returns {string} A human-readable name for menus and messages.
 */
export function displayName(key) {
    if (key.startsWith(POTION_KEY_PREFIX)) {
        const effect = key.slice(POTION_KEY_PREFIX.length);
        return prettifySegment(effect) + " Potion";
    }
    const colon = key.indexOf(":");
    const path = colon === -1 ? key : key.slice(colon + 1);
    return prettifySegment(path);
}
