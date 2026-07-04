import { COLLECTIBLE_KEYS } from "./collectibles.js";

const KEY_SET = new Set(COLLECTIBLE_KEYS);
const SORTED_KEYS = COLLECTIBLE_KEYS.slice().sort();

/**
 * Returns the fixed total number of collectible keys in the challenge.
 * @returns {number} The challenge denominator.
 */
export function totalCollectibles() {
    return SORTED_KEYS.length;
}

/**
 * Returns the full sorted list of collectible keys.
 * @returns {string[]} Every canonical collectible key, sorted.
 */
export function allCollectibleKeys() {
    return SORTED_KEYS;
}

/**
 * Reports whether a key is part of the fixed challenge list.
 * @param {string} key Collectible key to test.
 * @returns {boolean} True if the key counts toward the challenge.
 */
export function isCollectible(key) {
    return KEY_SET.has(key);
}
