import { ModalFormData, ActionFormData } from "@minecraft/server-ui";
import { getSettings, saveSettings } from "./settings.js";
import { loadPlayerCollected, loadGlobalCollected } from "./storage.js";
import { displayName } from "./collectible.js";
import { allCollectibleKeys, totalCollectibles } from "./registry.js";

const COLLECTION_PAGE_SIZE = 100;

/**
 * Shows a form, retrying while the player is busy with another screen.
 * @param {ModalFormData|ActionFormData} form Form to display.
 * @param {import("@minecraft/server").Player} player Target player.
 * @returns {Promise<import("@minecraft/server-ui").ModalFormResponse|import("@minecraft/server-ui").ActionFormResponse>} The form response.
 */
async function showSafe(form, player) {
    let response;
    do {
        response = await form.show(player);
    } while (response.canceled && response.cancelationReason === "UserBusy");
    return response;
}

/**
 * Opens the settings form and persists any changes the player makes.
 * @param {import("@minecraft/server").Player} player Player opening settings.
 * @returns {Promise<void>} Resolves once the form is handled.
 */
export async function openSettingsForm(player) {
    const settings = getSettings();
    const form = new ModalFormData()
        .title("Unlocker Settings")
        .toggle("§eGlobal Counter§r", { defaultValue: settings.globalCounter })
        .toggle("§eDisable Unlock Sound§r", { defaultValue: settings.disableSound })
        .toggle("§eDisable Unlock Message§r", { defaultValue: settings.disableMessage });
    const response = await showSafe(form, player);
    if (response.canceled) {
        return;
    }
    const values = response.formValues;
    saveSettings(values[0] === true, values[1] === true, values[2] === true);
    player.sendMessage("§aItem Unlocker settings saved.§r");
}

/**
 * Resolves the active collected set for a viewer based on the counter mode.
 * @param {import("@minecraft/server").Player} player Player viewing progress.
 * @returns {{collected: Set<string>, global: boolean}} Progress view data.
 */
function progressView(player) {
    const settings = getSettings();
    const collected = settings.globalCounter ? loadGlobalCollected() : loadPlayerCollected(player);
    return { collected, global: settings.globalCounter };
}

/**
 * Sends the viewer their current collection progress in chat.
 * @param {import("@minecraft/server").Player} player Player checking progress.
 * @returns {void}
 */
export function sendProgress(player) {
    const view = progressView(player);
    const have = view.collected.size;
    const total = totalCollectibles();
    const scope = view.global ? "Global" : "Your";
    const percent = Math.floor((have / total) * 100);
    player.sendMessage(
        "§6[Item Unlocker]§r " + scope + " progress: §a" + have + "§r / §e" + total + "§r (§b" + percent + "%§r)"
    );
}

/**
 * Builds the body text listing collected and uncollected items for one page.
 * @param {string[]} keys Sorted collectible keys for the current page.
 * @param {Set<string>} collected The viewer's collected keys.
 * @returns {string} Formatted multi-line body text.
 */
function buildListBody(keys, collected) {
    const lines = [];
    for (const key of keys) {
        if (collected.has(key)) {
            lines.push("§a[X] " + displayName(key) + "§r");
        } else {
            lines.push("§c[ ] §7" + displayName(key) + "§r");
        }
    }
    return lines.join("\n");
}

/**
 * Opens a paged form showing every collected and uncollected item as body text.
 * @param {import("@minecraft/server").Player} player Player viewing the collection.
 * @param {number} page Zero-based page index to display.
 * @returns {Promise<void>} Resolves once the form is handled.
 */
export async function openCollectionForm(player, page) {
    const view = progressView(player);
    const keys = allCollectibleKeys();
    const total = keys.length;
    const pageCount = Math.ceil(total / COLLECTION_PAGE_SIZE);
    const current = Math.min(Math.max(page, 0), pageCount - 1);
    const start = current * COLLECTION_PAGE_SIZE;
    const end = Math.min(start + COLLECTION_PAGE_SIZE, total);
    const scope = view.global ? "Global" : "Your";
    const heading =
        "§6" + scope + " collection §r- §a" + view.collected.size + "§r / §e" + total +
        "§r  |  §7Page " + (current + 1) + " / " + pageCount + "§r\n\n";
    const form = new ActionFormData()
        .title("Item Collection")
        .body(heading + buildListBody(keys.slice(start, end), view.collected));
    const hasPrev = current > 0;
    const hasNext = current < pageCount - 1;
    if (hasPrev) {
        form.button("§9<< Previous Page§r");
    }
    if (hasNext) {
        form.button("§9Next Page >>§r");
    }
    form.button("§8Close§r");
    const response = await showSafe(form, player);
    if (response.canceled) {
        return;
    }
    let index = 0;
    if (hasPrev) {
        if (response.selection === index) {
            await openCollectionForm(player, current - 1);
            return;
        }
        index++;
    }
    if (hasNext) {
        if (response.selection === index) {
            await openCollectionForm(player, current + 1);
            return;
        }
        index++;
    }
}
