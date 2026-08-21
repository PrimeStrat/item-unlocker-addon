import { world, system, CommandPermissionLevel, CustomCommandStatus, CustomCommandParamType } from "@minecraft/server";
import { collectibleKey, displayName } from "./collectible.js";
import {
    loadPlayerCollected,
    loadGlobalCollected,
    addPlayerKey,
    addGlobalKey,
    resetAllProgress,
    reconcilePlayerEpoch
} from "./storage.js";
import { getSettings } from "./settings.js";
import { openSettingsForm, openCollectionForm, sendProgress, openResetForm } from "./ui.js";
import { isCollectible, totalCollectibles } from "./registry.js";

const UNLOCK_SOUND = "random.orb";

const playerCache = new Map();
let globalCache = new Set();

/**
 * Loads a player's collected set into the in-memory cache.
 * @param {import("@minecraft/server").Player} player Player to cache.
 * @returns {Set<string>} The cached set for that player.
 */
function cachePlayer(player) {
    const collected = loadPlayerCollected(player);
    playerCache.set(player.id, collected);
    return collected;
}

/**
 * Returns a player's cached collected set, loading it if absent.
 * @param {import("@minecraft/server").Player} player Player whose cache is needed.
 * @returns {Set<string>} The cached set for that player.
 */
function getPlayerCache(player) {
    const existing = playerCache.get(player.id);
    if (existing) {
        return existing;
    }
    return cachePlayer(player);
}

/**
 * Resets all stored progress and rebuilds the in-memory caches to match.
 * @returns {void}
 */
function performReset() {
    resetAllProgress();
    globalCache = new Set();
    playerCache.clear();
    for (const player of world.getAllPlayers()) {
        cachePlayer(player);
    }
}

/**
 * Announces a newly unlocked collectible and plays its sound for a player.
 * @param {import("@minecraft/server").Player} player Player who unlocked the item.
 * @param {string} key Collectible key that was unlocked.
 * @returns {void}
 */
function announceUnlock(player, key, playerCount) {
    const settings = getSettings();
    const name = displayName(key);
    const total = totalCollectibles();
    const have = settings.globalCounter ? globalCache.size : playerCount;
    if (!settings.disableMessage) {
        world.sendMessage(
            "§b" + player.name + "§r unlocked §a" + name +
            "§r! §7(" + have + "/" + total + ")§r"
        );
    }
    if (!settings.disableSound) {
        const fresh = world.getPlayers({ name: player.name })[0];
        if (fresh) {
            fresh.playSound(UNLOCK_SOUND);
        }
    }
}

/**
 * Records any newly acquired collectible for a player and its global registry.
 * Only items that belong to the fixed challenge list are counted.
 * @param {import("@minecraft/server").Player} player Player acquiring the item.
 * @param {import("@minecraft/server").ItemStack} itemStack Stack that entered the inventory.
 * @returns {void}
 */
function recordAcquisition(player, itemStack) {
    const key = collectibleKey(itemStack);
    if (!isCollectible(key)) {
        return;
    }
    const cache = getPlayerCache(player);
    if (cache.has(key)) {
        return;
    }
    cache.add(key);
    addPlayerKey(player, key);
    if (!globalCache.has(key)) {
        globalCache.add(key);
        addGlobalKey(key);
    }
    announceUnlock(player, key, cache.size);
}

/**
 * Registers the three custom commands on world startup.
 * @param {import("@minecraft/server").StartupEvent} event Startup registration event.
 * @returns {void}
 */
function registerCommands(event) {
    const registry = event.customCommandRegistry;
    registry.registerEnum("iuc:filter", ["all", "collected", "missing"]);
    registry.registerCommand(
        {
            name: "iuc:settings",
            description: "Open the Item Unlocker Challenge settings.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure, message: "Run this as a player." };
            }
            system.run(() => openSettingsForm(player));
            return { status: CustomCommandStatus.Success };
        }
    );
    registry.registerCommand(
        {
            name: "iuc:progress",
            description: "Show your Item Unlocker Challenge progress.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure, message: "Run this as a player." };
            }
            system.run(() => sendProgress(player));
            return { status: CustomCommandStatus.Success };
        }
    );
    registry.registerCommand(
        {
            name: "iuc:collection",
            description: "Browse collected and uncollected items.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            optionalParameters: [
                { name: "iuc:filter", type: CustomCommandParamType.Enum }
            ]
        },
        (origin, filter) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure, message: "Run this as a player." };
            }
            const mode = filter || "all";
            system.run(() => openCollectionForm(player, 0, mode));
            return { status: CustomCommandStatus.Success };
        }
    );
    registry.registerCommand(
        {
            name: "iuc:reset",
            description: "Reset all Item Unlocker Challenge progress.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure, message: "Run this as a player." };
            }
            system.run(() => openResetForm(player, performReset));
            return { status: CustomCommandStatus.Success };
        }
    );
}

system.beforeEvents.startup.subscribe(registerCommands);

world.afterEvents.worldLoad.subscribe(() => {
    globalCache = loadGlobalCollected();
    for (const player of world.getAllPlayers()) {
        cachePlayer(player);
    }
});

world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) {
        reconcilePlayerEpoch(event.player);
        cachePlayer(event.player);
    }
});

world.afterEvents.playerLeave.subscribe((event) => {
    playerCache.delete(event.playerId);
});

world.afterEvents.playerInventoryItemChange.subscribe((event) => {
    const itemStack = event.itemStack;
    if (!itemStack) {
        return;
    }
    recordAcquisition(event.player, itemStack);
});
