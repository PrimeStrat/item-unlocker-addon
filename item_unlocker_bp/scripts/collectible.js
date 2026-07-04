import { ItemComponentTypes } from "@minecraft/server";

const POTION_KEY_PREFIX = "potion:";
const ARROW_KEY_PREFIX = "arrow:";
const COLOR_SEPARATOR = "#";
const ARROW_TYPE_ID = "minecraft:arrow";

const ARROW_EFFECT_ALIASES = {
    "nightvision": "night_vision",
    "moveSpeed": "swiftness",
    "moveslowdown": "slowness",
    "firresistance": "fire_resistance",
    "fireresistance": "fire_resistance",
    "waterbreathing": "water_breathing",
    "jump": "leaping",
    "heal": "healing",
    "harm": "harming",
    "damageboost": "strength",
    "wither": "decay",
    "turtlemaster": "turtle_master",
    "slowfalling": "slow_falling",
    "windcharged": "wind_charged"
};

const ARROW_NON_EFFECTS = new Set([
    "empty",
    "mundane",
    "thick",
    "awkward",
    "water"
]);

const ID_ALIASES = {
    "minecraft:chipped_anvil": "minecraft:anvil",
    "minecraft:damaged_anvil": "minecraft:anvil",
    "minecraft:netherite_upgrade": "minecraft:netherite_upgrade_smithing_template"
};

const COLORED_TYPES = new Set([
    "minecraft:bed",
    "minecraft:banner"
]);

const LANG_COLOR_ALIASES = {
    "silver": "light_gray",
    "lightblue": "light_blue"
};

/**
 * Extracts the color token from a colored item's localization key.
 * Bed and banner colors are carried in the localization key
 * (e.g. item.bed.black.name) rather than the shared type id.
 * @param {string} localizationKey The item's localizationKey.
 * @returns {string} A normalized color token, or "unknown" if none.
 */
function colorFromLocalizationKey(localizationKey) {
    const parts = localizationKey.split(".");
    if (parts.length < 3) {
        return "unknown";
    }
    const raw = parts[2].toLowerCase();
    if (LANG_COLOR_ALIASES[raw]) {
        return LANG_COLOR_ALIASES[raw];
    }
    return raw;
}

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
 * Resolves the collectible key for an arrow stack from its localization key.
 * Tipped arrows share the minecraft:arrow type id and carry their effect in
 * the localization key (tipped_arrow.effect.moveSpeed). Amplifier and duration
 * are not encoded there, so every tier of an effect maps to one arrow key.
 * A plain arrow keeps the base minecraft:arrow key.
 * @param {string} localizationKey The arrow's localizationKey.
 * @returns {string} An arrow effect key (arrow:swiftness) or the plain arrow id.
 */
function arrowKey(localizationKey) {
    const marker = "tipped_arrow.effect.";
    const at = localizationKey.indexOf(marker);
    if (at === -1) {
        return ARROW_TYPE_ID;
    }
    const rawToken = localizationKey.slice(at + marker.length).split(".")[0];
    if (ARROW_NON_EFFECTS.has(rawToken.toLowerCase())) {
        return ARROW_TYPE_ID;
    }
    const aliased = ARROW_EFFECT_ALIASES[rawToken] || ARROW_EFFECT_ALIASES[rawToken.toLowerCase()];
    const effect = aliased || rawToken.toLowerCase();
    return ARROW_KEY_PREFIX + effect;
}

/**
 * Resolves the collectible key for an item stack.
 * Everything is tracked by its item type id, so meta such as durability,
 * enchantments, dye color, and flavor text collapse to a single entry.
 * Potions are keyed by their base effect type, ignoring delivery
 * (splash/lingering) and modifier (amplifier/duration). Damaged anvil
 * variants collapse back onto the base anvil. Beds and banners share one
 * type id per color, so their color is read from the localization key and
 * appended, letting each colored variant count separately.
 * @param {import("@minecraft/server").ItemStack} itemStack Stack that entered an inventory.
 * @returns {string} The stable collectible key for this stack.
 */
export function collectibleKey(itemStack) {
    const potion = itemStack.getComponent(ItemComponentTypes.Potion);
    if (potion) {
        return potionKey(potion.potionEffectType.id);
    }
    const typeId = itemStack.typeId;
    if (typeId === ARROW_TYPE_ID) {
        return arrowKey(itemStack.localizationKey);
    }
    if (COLORED_TYPES.has(typeId)) {
        return typeId + COLOR_SEPARATOR + colorFromLocalizationKey(itemStack.localizationKey);
    }
    if (ID_ALIASES[typeId]) {
        return ID_ALIASES[typeId];
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
    if (key.startsWith(ARROW_KEY_PREFIX)) {
        const effect = key.slice(ARROW_KEY_PREFIX.length);
        return "Arrow of " + prettifySegment(effect);
    }
    const separator = key.indexOf(COLOR_SEPARATOR);
    if (separator !== -1) {
        const base = key.slice(0, separator);
        const color = key.slice(separator + 1);
        const colon = base.indexOf(":");
        const path = colon === -1 ? base : base.slice(colon + 1);
        return prettifySegment(color) + " " + prettifySegment(path);
    }
    const colon = key.indexOf(":");
    let path = colon === -1 ? key : key.slice(colon + 1);
    path = path.replace(/_smithing_template$/, "");
    return prettifySegment(path);
}
