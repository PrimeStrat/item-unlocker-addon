import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
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
 * Opens a warning form and runs the reset callback only if confirmed.
 * @param {import("@minecraft/server").Player} player Player requesting the reset.
 * @param {() => void} onConfirm Callback that performs the reset.
 * @returns {Promise<void>} Resolves once the form is handled.
 */
export async function openResetForm(player, onConfirm) {
    const form = new MessageFormData()
        .title("§4Reset All Progress§r")
        .body(
            "§cThis will erase §lALL§r§c collected items for §levery player§r§c and the\n" +
            "global collection. This cannot be undone.\n\n§eAre you sure?§r"
        )
        .button1("§4Reset Everything§r")
        .button2("§8Cancel§r");
    const response = await showSafe(form, player);
    if (response.canceled || response.selection !== 0) {
        return;
    }
    onConfirm();
    player.sendMessage("§cAll Item Unlocker progress has been reset.§r");
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
    const percent = ((have / total) * 100).toFixed(1);
    const label = view.global ? "§6Global progress (all players):§r " : "§6Your progress:§r ";
    player.sendMessage(
        label + "§a" + have + "§r / §e" + total + "§r (§b" + percent + "%%§r)"
    );
}

/**
 * Builds the body text listing collected and uncollected items for one page.
 * @param {string[]} keys Sorted collectible keys for the current page.
 * @param {Set<string>} collected The viewer's collected keys.
 * @returns {string} Formatted multi-line body text.
 */
function renderLine(key, collected) {
    if (collected.has(key)) {
        return "§a[X] " + displayName(key) + "§r";
    }
    return "§c[ ] §7" + displayName(key) + "§r";
}

/**
 * Selects the collectible keys that match a filter mode.
 * @param {Set<string>} collected The viewer's collected keys.
 * @param {string} filter One of "all", "collected", or "missing".
 * @returns {string[]} The keys to display, in canonical order.
 */
function filterKeys(collected, filter) {
    const keys = allCollectibleKeys();
    if (filter === "collected") {
        return keys.filter((key) => collected.has(key));
    }
    if (filter === "missing") {
        return keys.filter((key) => !collected.has(key));
    }
    return keys;
}

/**
 * Groups the given keys into fixed-size pages of rendered lines.
 * @param {string[]} keys Keys to page, already filtered and ordered.
 * @param {Set<string>} collected The viewer's collected keys.
 * @returns {string[][]} Pages, each an array of rendered lines.
 */
function computePages(keys, collected) {
    const pages = [];
    for (let start = 0; start < keys.length; start += COLLECTION_PAGE_SIZE) {
        const page = [];
        const end = Math.min(start + COLLECTION_PAGE_SIZE, keys.length);
        for (let i = start; i < end; i++) {
            page.push(renderLine(keys[i], collected));
        }
        pages.push(page);
    }
    return pages;
}

/**
 * Labels the active filter for the form heading.
 * @param {string} filter One of "all", "collected", or "missing".
 * @returns {string} A short heading suffix, or empty for "all".
 */
function filterLabel(filter) {
    if (filter === "collected") {
        return " §7[collected]§r";
    }
    if (filter === "missing") {
        return " §7[missing]§r";
    }
    return "";
}

/**
 * Opens a paged form showing collected and uncollected items as body text.
 * @param {import("@minecraft/server").Player} player Player viewing the collection.
 * @param {number} page Zero-based page index to display.
 * @param {string} filter One of "all", "collected", or "missing".
 * @returns {Promise<void>} Resolves once the form is handled.
 */
export async function openCollectionForm(player, page, filter) {
    const view = progressView(player);
    const total = totalCollectibles();
    const keys = filterKeys(view.collected, filter);
    const scope = view.global ? "§6Global collection (all players)§r" : "§6Your collection§r";
    if (keys.length === 0) {
        const empty = new ActionFormData()
            .title("Item Collection")
            .body(scope + filterLabel(filter) + "\n\n§7No items match this filter.§r")
            .button("§8Close§r");
        await showSafe(empty, player);
        return;
    }
    const pages = computePages(keys, view.collected);
    const pageCount = pages.length;
    const current = Math.min(Math.max(page, 0), pageCount - 1);
    const heading =
        scope + filterLabel(filter) + " - §a" + view.collected.size + "§r / §e" + total + "§r\n\n";
    const title = "Item Collection §0(" + (current + 1) + " / " + pageCount + ")§r";
    const form = new ActionFormData()
        .title(title)
        .body(heading + pages[current].join("\n"));
    const hasNext = current < pageCount - 1;
    const hasPrev = current > 0;
    if (hasNext) {
        form.button("§9Next Page >>§r");
    }
    if (hasPrev) {
        form.button("§9<< Previous Page§r");
    }
    form.button("§8Close§r");
    const response = await showSafe(form, player);
    if (response.canceled) {
        return;
    }
    let index = 0;
    if (hasNext) {
        if (response.selection === index) {
            await openCollectionForm(player, current + 1, filter);
            return;
        }
        index++;
    }
    if (hasPrev) {
        if (response.selection === index) {
            await openCollectionForm(player, current - 1, filter);
            return;
        }
        index++;
    }
}
