import { world } from "@minecraft/server";

const GLOBAL_COUNTER_PROP = "iuc:global_counter";
const DISABLE_SOUND_PROP = "iuc:disable_sound";
const DISABLE_MESSAGE_PROP = "iuc:disable_message";

/**
 * @typedef {Object} UnlockerSettings
 * @property {boolean} globalCounter Track a shared global collection instead of per-player.
 * @property {boolean} disableSound Suppress the item unlock sound.
 * @property {boolean} disableMessage Suppress the item unlock chat message.
 */

/**
 * Reads a boolean world dynamic property with a default fallback.
 * @param {string} prop Dynamic property identifier.
 * @param {boolean} fallback Value used when the property is unset.
 * @returns {boolean} The stored boolean or the fallback.
 */
function readBool(prop, fallback) {
    const value = world.getDynamicProperty(prop);
    if (typeof value !== "boolean") {
        return fallback;
    }
    return value;
}

/**
 * Reads the current addon settings from world dynamic properties.
 * @returns {UnlockerSettings} The current settings.
 */
export function getSettings() {
    return {
        globalCounter: readBool(GLOBAL_COUNTER_PROP, false),
        disableSound: readBool(DISABLE_SOUND_PROP, false),
        disableMessage: readBool(DISABLE_MESSAGE_PROP, false)
    };
}

/**
 * Persists the addon settings to world dynamic properties.
 * @param {boolean} globalCounter Track a shared global collection instead of per-player.
 * @param {boolean} disableSound Suppress the item unlock sound.
 * @param {boolean} disableMessage Suppress the item unlock chat message.
 * @returns {void}
 */
export function saveSettings(globalCounter, disableSound, disableMessage) {
    world.setDynamicProperty(GLOBAL_COUNTER_PROP, globalCounter);
    world.setDynamicProperty(DISABLE_SOUND_PROP, disableSound);
    world.setDynamicProperty(DISABLE_MESSAGE_PROP, disableMessage);
}
