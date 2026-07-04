import { world } from "@minecraft/server";

const SHARD_COUNT = 16;
const PLAYER_SHARD_PREFIX = "iuc:pc";
const GLOBAL_SHARD_PREFIX = "iuc:gc";

/**
 * Computes a stable non-negative shard index for a collectible key.
 * @param {string} key Collectible key (item type id or potion effect key).
 * @returns {number} Shard index in the range [0, SHARD_COUNT).
 */
function shardIndex(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return ((hash % SHARD_COUNT) + SHARD_COUNT) % SHARD_COUNT;
}

/**
 * Reads a single shard array from a dynamic-property holder.
 * @param {import("@minecraft/server").World|import("@minecraft/server").Player} holder Property owner.
 * @param {string} prefix Shard property prefix.
 * @param {number} index Shard index to read.
 * @returns {string[]} Keys stored in that shard (empty if unset).
 */
function readShard(holder, prefix, index) {
    const raw = holder.getDynamicProperty(prefix + index);
    if (typeof raw !== "string" || raw.length === 0) {
        return [];
    }
    return JSON.parse(raw);
}

/**
 * Writes a single shard array back to a dynamic-property holder.
 * @param {import("@minecraft/server").World|import("@minecraft/server").Player} holder Property owner.
 * @param {string} prefix Shard property prefix.
 * @param {number} index Shard index to write.
 * @param {string[]} keys Keys to store in that shard.
 * @returns {void}
 */
function writeShard(holder, prefix, index, keys) {
    holder.setDynamicProperty(prefix + index, JSON.stringify(keys));
}

/**
 * Loads every collected key from all shards on a holder into one Set.
 * @param {import("@minecraft/server").World|import("@minecraft/server").Player} holder Property owner.
 * @param {string} prefix Shard property prefix.
 * @returns {Set<string>} All collected keys for that holder.
 */
function loadAll(holder, prefix) {
    const all = new Set();
    for (let i = 0; i < SHARD_COUNT; i++) {
        const keys = readShard(holder, prefix, i);
        for (const key of keys) {
            all.add(key);
        }
    }
    return all;
}

/**
 * Adds a key to the correct shard on a holder if not already present.
 * @param {import("@minecraft/server").World|import("@minecraft/server").Player} holder Property owner.
 * @param {string} prefix Shard property prefix.
 * @param {string} key Collectible key to add.
 * @returns {boolean} True if the key was newly added, false if it existed.
 */
function addToShard(holder, prefix, key) {
    const index = shardIndex(key);
    const keys = readShard(holder, prefix, index);
    if (keys.indexOf(key) !== -1) {
        return false;
    }
    keys.push(key);
    writeShard(holder, prefix, index, keys);
    return true;
}

/**
 * Loads a player's full collected-key set from their shards.
 * @param {import("@minecraft/server").Player} player Owning player.
 * @returns {Set<string>} The player's collected keys.
 */
export function loadPlayerCollected(player) {
    return loadAll(player, PLAYER_SHARD_PREFIX);
}

/**
 * Loads the global collected-key set from the world shards.
 * @returns {Set<string>} All globally collected keys.
 */
export function loadGlobalCollected() {
    return loadAll(world, GLOBAL_SHARD_PREFIX);
}

/**
 * Records a key against a player's shards.
 * @param {import("@minecraft/server").Player} player Owning player.
 * @param {string} key Collectible key to add.
 * @returns {boolean} True if newly added for that player.
 */
export function addPlayerKey(player, key) {
    return addToShard(player, PLAYER_SHARD_PREFIX, key);
}

/**
 * Records a key against the global world shards.
 * @param {string} key Collectible key to add.
 * @returns {boolean} True if newly added globally.
 */
export function addGlobalKey(key) {
    return addToShard(world, GLOBAL_SHARD_PREFIX, key);
}
