// ==UserScript==
// @name         Torn City Company Stock Alert
// @version      0.2.1
// @description  Flash the Job sidebar when your company stock is not sufficient to support a set amount of days of sales.
// @author       404hasfound [2995605]
// @namespace    https://github.com/4o4hasfound/torn_city_company_stock_alert
// @match        https://www.torn.com/*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @license      GNU GPLv3
// ==/UserScript==

'use strict';

const DEFAULT_MIN_DAYS_OF_STOCK = 2;

const SETTING_CSS_STYLE = `
    .csa-card {
        margin-top: 20px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        border: 1px solid #2e2e30;
        background: #1b1b1c;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }
    .csa-header {
        background: #232325;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        border-bottom: 1px solid #2e2e30;
        user-select: none;
    }
    .csa-title {
        color: #ffffff;
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .csa-toggle {
        font-size: 10px;
        font-weight: 600;
        color: #88888b;
        border: 1px solid #3c3c3e;
        padding: 3px 8px;
        border-radius: 4px;
        letter-spacing: 0.5px;
        transition: all 0.2s;
    }
    .csa-header:hover .csa-toggle {
        color: #ffffff;
        border-color: #5c5c5e;
        background: rgba(255, 255, 255, 0.05);
    }
    .csa-content {
        padding: 20px 24px;
        background: #161617;
    }
    .csa-field {
        margin-bottom: 16px;
    }
    .csa-label {
        display: block;
        font-weight: 700;
        font-size: 10px;
        color: #88888b;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 6px;
    }
    .csa-input {
        width: 100%;
        max-width: 320px;
        background: #1f1f21;
        border: 1px solid #3c3c3e;
        color: #ffffff;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 13px;
        outline: none;
        transition: all 0.2s;
    }
    .csa-input:focus {
        border-color: #88888b;
        box-shadow: 0 0 0 1px #88888b;
    }
    .csa-input::-webkit-outer-spin-button,
    .csa-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .csa-input[type=number] {
        -moz-appearance: textfield;
    }
    .csa-btn {
        background: #ffffff;
        color: #000000;
        border: none;
        padding: 10px 24px;
        font-weight: 700;
        font-size: 12px;
        border-radius: 6px;
        cursor: pointer;
        letter-spacing: 0.5px;
        transition: all 0.2s;
    }
    .csa-btn:hover {
        background: #e0e0e0;
        transform: translateY(-0.5px);
    }
    .csa-btn:active {
        transform: translateY(0) scale(0.98);
    }
    .csa-toast {
        margin-left: 16px;
        color: #88888b;
        font-weight: 600;
        font-size: 11px;
        opacity: 0;
        transition: opacity 0.3s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    @keyframes csa-pulse {
        0% { opacity: 0; }
        50% { opacity: 0.55; }
        100% { opacity: 0; }
    }
    .csa-warning-flash {
        position: relative !important;
    }
    .csa-warning-flash::after {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        pointer-events: none !important;
        z-index: 99999 !important;
        border-radius: inherit !important;
        background-color: var(--csa-flash-color, #e74c3c) !important;
        animation: csa-pulse var(--csa-flash-speed, 2s) infinite ease-in-out !important;
    }
`;

function getApiKey() {
    return GM_getValue("apiKey", "");
}

function getMinDaysOfStock() {
    const days = GM_getValue("min_days_of_stock", "");
    if (days !== "") return parseInt(days, 10);
    return DEFAULT_MIN_DAYS_OF_STOCK;
}

function getAlertFlashColor() {
    return GM_getValue("alert_flash_color", "#e74c3c");
}

function getAlertEnabled() {
    return GM_getValue("alert_enabled", true);
}

function getAlertFlashSpeed() {
    const speed = GM_getValue("alert_flash_speed", "");
    if (speed !== "") return parseFloat(speed);
    return 2;
}

function injectStyles() {
    if (!document.getElementById("csa-styles")) {
        const style = document.createElement("style");
        style.id = "csa-styles";
        style.innerHTML = SETTING_CSS_STYLE;
        document.head.appendChild(style);
    }
}

function injectSettingsPanel() {
    if (!window.location.href.startsWith("https://www.torn.com/companies.php")) return;

    const companyWrap = document.querySelector(".company-wrap");
    if (!companyWrap || document.getElementById("csa-settings-container")) {
        return;
    }

    const container = document.createElement("div");
    container.id = "csa-settings-container";
    container.className = "csa-card";

    const savedApiKey = getApiKey();
    const savedDays = getMinDaysOfStock();
    const savedFlashColor = getAlertFlashColor();
    const savedEnabled = getAlertEnabled();
    const savedFlashSpeed = getAlertFlashSpeed();
    const isCollapsedInit = savedApiKey ? GM_getValue("csa_collapsed", true) : false;

    container.innerHTML = `
        <div class="csa-header" id="csa-header">
            <span class="csa-title">Company Stock Alert Settings</span>
            <span class="csa-toggle" id="csa-toggle-text">${isCollapsedInit ? 'SHOW' : 'HIDE'}</span>
        </div>
        <div class="csa-content" id="csa-content" style="display: ${isCollapsedInit ? 'none' : 'block'};">
            <div class="csa-field" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <input type="checkbox" id="csa-enabled" style="cursor: pointer; width: 15px; height: 15px; margin: 0;" ${savedEnabled ? 'checked' : ''}>
                <label class="csa-label" for="csa-enabled" style="margin-bottom: 0; cursor: pointer;">Enable Stock Alert Flashing</label>
            </div>
            <div class="csa-field">
                <label class="csa-label">Limited Access API Key</label>
                <input type="text" id="csa-api-key" class="csa-input" value="${savedApiKey}" placeholder="Enter Torn API Key...">
                <span id="csa-api-feedback" style="display: block; font-size: 11px; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;"></span>
            </div>
            <div class="csa-field">
                <label class="csa-label">Minimum Days of Stock Alert Threshold</label>
                <input type="number" id="csa-days" class="csa-input" value="${savedDays}" min="1" step="1" style="width: 80px;">
                <span id="csa-days-feedback" style="display: block; font-size: 11px; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;"></span>
            </div>
            
            <div id="csa-advanced-toggle" style="cursor: pointer; color: #88888b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px; border-top: 1px solid #2e2e30; padding: 12px 0; display: flex; justify-content: space-between; align-items: center; line-height: 1; user-select: none;">
                <span>Flashing Options</span>
                <span id="csa-advanced-toggle-text" style="border: 1px solid #3c3c3e; padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; line-height: 1; height: 14px;">SHOW</span>
            </div>
            <div id="csa-advanced-content" style="display: none; padding-bottom: 12px;">
                <div class="csa-field" style="margin-bottom: 12px;">
                    <label class="csa-label">Alert Flash Color</label>
                    <input type="color" id="csa-flash-color" value="${savedFlashColor}" style="width: 50px; height: 35px; padding: 0; border: 1px solid #3c3c3e; border-radius: 4px; cursor: pointer; background: none; outline: none;">
                </div>
                <div class="csa-field">
                    <label class="csa-label">Pulse Duration (Seconds)</label>
                    <input type="number" id="csa-flash-speed" class="csa-input" value="${savedFlashSpeed}" min="0.1" step="0.1" style="width: 80px;">
                    <span id="csa-speed-feedback" style="display: block; font-size: 11px; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;"></span>
                </div>
            </div>

            <div style="display: flex; align-items: center; margin-top: 0; border-top: 1px solid #2e2e30; padding-top: 12px;">
                <button class="csa-btn" id="csa-save-btn">SAVE</button>
                <span id="csa-toast" class="csa-toast">Saved successfully!</span>
            </div>
        </div>
    `;

    companyWrap.insertBefore(container, companyWrap.firstChild);

    // Expandable setting
    const headerEl = container.querySelector("#csa-header");
    const contentEl = container.querySelector("#csa-content");
    const toggleTextEl = container.querySelector("#csa-toggle-text");

    headerEl.addEventListener("click", () => {
        const isCurrentlyHidden = contentEl.style.display === "none";
        contentEl.style.display = isCurrentlyHidden ? "block" : "none";
        toggleTextEl.textContent = isCurrentlyHidden ? "HIDE" : "SHOW";
        GM_setValue("csa_collapsed", !isCurrentlyHidden);
    });

    // Expandable flashing setting
    const advToggleEl = container.querySelector("#csa-advanced-toggle");
    const advContentEl = container.querySelector("#csa-advanced-content");
    const advToggleTextEl = container.querySelector("#csa-advanced-toggle-text");

    advToggleEl.addEventListener("click", () => {
        const isCurrentlyHidden = advContentEl.style.display === "none";
        advContentEl.style.display = isCurrentlyHidden ? "block" : "none";
        advToggleTextEl.textContent = isCurrentlyHidden ? "HIDE" : "SHOW";
    });

    // Save Button
    const saveBtn = container.querySelector("#csa-save-btn");
    const enabledInput = container.querySelector("#csa-enabled");
    const apiInput = container.querySelector("#csa-api-key");
    const apiFeedback = container.querySelector("#csa-api-feedback");
    const daysInput = container.querySelector("#csa-days");
    const daysFeedback = container.querySelector("#csa-days-feedback");
    const speedInput = container.querySelector("#csa-flash-speed");
    const speedFeedback = container.querySelector("#csa-speed-feedback");
    const toast = container.querySelector("#csa-toast");

    saveBtn.addEventListener("click", () => {
        const keyVal = apiInput.value.trim();
        const daysVal = parseInt(daysInput.value, 10);
        const colorVal = container.querySelector("#csa-flash-color").value;
        const enabledVal = enabledInput.checked;
        const speedVal = parseFloat(speedInput.value);

        // Previous message
        apiFeedback.textContent = "";
        daysFeedback.textContent = "";
        speedFeedback.textContent = "";

        // Ease in ease out for the message for the save button
        const showToast = () => {
            toast.style.opacity = "1";
            setTimeout(() => {
                toast.style.opacity = "0";
            }, 2500);
        };

        // Save general settings immediately
        GM_setValue("alert_flash_color", colorVal);
        GM_setValue("alert_enabled", enabledVal);

        // Validate and save days threshold
        if (Number.isNaN(daysVal) || daysVal < 0) {
            daysFeedback.style.color = "#e74c3c";
            daysFeedback.textContent = "Please enter a valid positive number";
        } else {
            GM_setValue("min_days_of_stock", daysVal);
        }

        // Validate and save pulse speed duration
        if (Number.isNaN(speedVal) || speedVal <= 0) {
            speedFeedback.style.color = "#e74c3c";
            speedFeedback.textContent = "Please enter a valid positive number";
        } else {
            GM_setValue("alert_flash_speed", speedVal);
        }

        // Save API Key only if verified successfully
        const currentSavedKey = getApiKey();
        if (!keyVal) {
            GM_setValue("apiKey", "");
            apiFeedback.style.color = "#e74c3c";
            apiFeedback.textContent = "API Key Verify Failed";
            showToast();
            run();
        } else if (keyVal === currentSavedKey) {
            apiFeedback.style.color = "#2ecc71";
            apiFeedback.textContent = "API Key Verified";
            showToast();
            run();
        } else {
            apiFeedback.style.color = "#88888b";
            apiFeedback.textContent = "Verifying API Key...";

            const verifyUrl = `https://api.torn.com/company/?selections=stock&key=${keyVal}`;
            fetch(verifyUrl)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error();
                })
                .then(data => {
                    if (data.error) {
                        apiFeedback.style.color = "#e74c3c";
                        apiFeedback.textContent = "API Key Verify Failed";
                    } else {
                        GM_setValue("apiKey", keyVal);
                        apiFeedback.style.color = "#2ecc71";
                        apiFeedback.textContent = "API Key Verified";
                        showToast();
                        run();
                    }
                })
                .catch(() => {
                    apiFeedback.style.color = "#e74c3c";
                    apiFeedback.textContent = "API Key Verify Failed";
                });
        }
    });
}

function waitForJobSidebar(cb) {
    const el = document.getElementById("nav-job");
    if (el) return cb(el);

    const observer = new MutationObserver(() => {
        const el = document.getElementById("nav-job");
        if (el) {
            observer.disconnect();
            cb(el);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

let hasStockWarning = false;

// Add the flashing css to the job sidebar if needed
function applySidebarHighlight() {
    waitForJobSidebar(el => {
        if (hasStockWarning && getAlertEnabled()) {
            el.style.setProperty('--csa-flash-color', getAlertFlashColor());
            el.style.setProperty('--csa-flash-speed', getAlertFlashSpeed() + 's');
            if (!el.classList.contains("csa-warning-flash")) {
                el.classList.add("csa-warning-flash");
            }
        } else {
            el.classList.remove("csa-warning-flash");
        }
    });
}

function run() {
    injectStyles();
    injectSettingsPanel();
    applySidebarHighlight();

    const apiKey = getApiKey();
    if (!apiKey) {
        return;
    }

    const stock_api = `https://api.torn.com/company/?selections=stock&key=${apiKey}`;

    fetch(stock_api)
        .then(function (response) {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response error');
        })
        .then(function (stocks) {
            if (stocks.error) {
                throw new Error(stocks.error.error);
            }

            let showWarning = false;
            for (var name in stocks.company_stock) {
                const stockItem = stocks.company_stock[name];
                if (!stockItem || !stockItem.sold_amount) {
                    continue;
                }
                var total = (stockItem.in_stock || 0) + (stockItem.on_order || 0);
                const limit = getMinDaysOfStock() * stockItem.sold_amount;
                if (total < limit) {
                    showWarning = true;
                    break;
                }
            }

            hasStockWarning = showWarning;
            applySidebarHighlight();
        }).catch(function (error) {
            console.log('There has been a problem with your fetch operation: ', error.message);
        });
}

run();