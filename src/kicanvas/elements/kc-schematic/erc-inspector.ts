/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import {
    type ComponentERCResult,
    type PinCheckResult,
} from "../../../proto/component_erc_result";
import { type ProjectErcResult } from "../../../proto/project_erc_result";

export class KCErcInspectorElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                position: fixed;
                z-index: 1000;
                font-family: var(--font-family, sans-serif);
                color: #e2e8f0; /* slate-200 */
                pointer-events: none; /* Let events pass through wrapper if needed, but components handle pointer-events */
                right: 1.5rem;
                bottom: 1.5rem;
            }
            :host(.open) {
                top: 1.5rem;
                bottom: auto;
            }

            .inspect-btn {
                pointer-events: auto;
                background-color: #0f172a; /* slate-900 */
                color: white;
                padding: 1rem;
                border-radius: 9999px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border: 1px solid #334155; /* slate-700 */
                cursor: pointer;
                transition: transform 0.2s;
            }
            .inspect-btn:hover {
                transform: scale(1.1);
            }

            .text-red-400 {
                color: #f87171;
            }
            .text-yellow-400 {
                color: #facc15;
            }
            .text-indigo-400 {
                color: #818cf8;
            }
            .text-indigo-300 {
                color: #a5b4fc;
            }
            .text-slate-500 {
                color: #64748b;
            }
            .text-slate-400 {
                color: #94a3b8;
            }
            .text-slate-300 {
                color: #cbd5e1;
            }
            .font-bold {
                font-weight: 700;
            }

            .panel {
                pointer-events: auto;
                width: 24rem; /* 96 */
                max-height: 85vh;
                background-color: rgba(15, 23, 42, 0.95); /* slate-900/95 */
                backdrop-filter: blur(12px);
                border: 1px solid #334155; /* slate-700 */
                border-radius: 0.75rem; /* xl */
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .header {
                padding: 1rem;
                border-bottom: 1px solid #334155;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background-color: rgba(30, 41, 59, 0.5); /* slate-800/50 */
            }
            .header h2 {
                margin: 0;
                font-size: 1.125rem;
                font-weight: 700;
                letter-spacing: -0.025em;
            }
            .close-btn {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 0.375rem;
                display: flex;
            }
            .close-btn:hover {
                background-color: #334155;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1px;
                background-color: #334155; /* slate-700 */
                border-bottom: 1px solid #334155;
            }
            .stat-btn {
                background-color: #1e293b; /* slate-800 */
                border: none;
                padding: 0.75rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .stat-btn:hover {
                background-color: #334155; /* slate-750 approx */
            }
            .stat-btn.active-error {
                background-color: rgba(127, 29, 29, 0.3); /* red-900/30 */
            }
            .stat-btn.active-warning {
                background-color: rgba(113, 63, 18, 0.3); /* yellow-900/30 */
            }
            .stat-count {
                font-size: 1.25rem;
                font-weight: 700;
            }
            .stat-label {
                font-size: 0.625rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #94a3b8;
                font-weight: 700;
            }

            .toolbar {
                padding: 0.75rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            .search-box {
                position: relative;
            }
            .search-icon {
                position: absolute;
                left: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                color: #64748b;
                pointer-events: none;
                width: 14px;
                height: 14px;
            }
            .search-input {
                width: 100%;
                background-color: #020617; /* slate-950 */
                border: 1px solid #334155;
                border-radius: 0.5rem;
                padding: 0.5rem 0.75rem 0.5rem 2.25rem;
                font-size: 0.875rem;
                color: inherit;
                outline: none;
                box-sizing: border-box; /* Fix for padding increasing width */
            }
            .search-input:focus {
                border-color: #6366f1; /* indigo-500 */
                box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.5);
            }

            .filter-row {
                display: flex;
                gap: 0.5rem;
            }
            .filter-all-btn {
                flex: 1;
                padding: 0.25rem 0.5rem;
                font-size: 0.6875rem; /* 11px */
                font-weight: 700;
                border-radius: 0.25rem;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all 0.2s;
            }
            .filter-all-btn.active {
                background-color: #4f46e5; /* indigo-600 */
                border-color: #818cf8; /* indigo-400 */
                color: white;
            }
            .filter-all-btn.inactive {
                background-color: #1e293b;
                border-color: #334155;
                color: #94a3b8;
            }
            .filter-all-btn.inactive:hover {
                background-color: #334155;
            }
            .clear-btn {
                background: none;
                border: none;
                padding: 0.25rem 0.5rem;
                font-size: 0.6875rem;
                font-weight: 700;
                color: #94a3b8;
                cursor: pointer;
            }
            .clear-btn:hover {
                color: white;
            }

            .list {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            /* Scrollbar styling */
            .list::-webkit-scrollbar {
                width: 4px;
            }
            .list::-webkit-scrollbar-track {
                background: transparent;
            }
            .list::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 10px;
            }
            .list::-webkit-scrollbar-thumb:hover {
                background: #475569;
            }

            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 3rem 0;
                color: #64748b;
            }
            .empty-icon {
                opacity: 0.2;
                width: 40px;
                height: 40px;
                margin-bottom: 0.5rem;
            }

            .comp-item {
                background-color: rgba(30, 41, 59, 0.4);
                border: 1px solid rgba(51, 65, 85, 0.5);
                border-radius: 0.5rem;
                overflow: hidden;
                transition: border-color 0.2s;
            }
            .comp-item:hover {
                border-color: #475569;
            }
            .comp-btn {
                width: 100%;
                padding: 0.75rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                text-align: left;
            }
            .comp-btn:hover {
                background-color: rgba(255, 255, 255, 0.05);
            }
            .comp-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .designator {
                font-family: monospace;
                font-weight: 700;
                color: #a5b4fc;
                text-transform: uppercase;
                letter-spacing: -0.05em;
            }
            .count-badge {
                padding: 0.125rem 0.375rem;
                border-radius: 9999px;
                background-color: #334155;
                font-size: 0.625rem;
                font-weight: 700;
                color: #cbd5e1;
            }

            .pin-list {
                padding: 0 0.5rem 0.5rem 0.5rem;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .pin-item {
                padding: 0.625rem;
                background-color: rgba(15, 23, 42, 0.5);
                border-radius: 0.25rem;
                border-left-width: 2px;
                border-left-style: solid;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .pin-item:hover {
                background-color: #0f172a;
            }
            .pin-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.25rem;
            }
            .pin-label {
                font-size: 0.625rem;
                font-weight: 700;
                text-transform: uppercase;
                color: #64748b;
            }
            .pin-msg {
                font-size: 0.75rem;
                color: #cbd5e1;
                margin: 0;
                line-height: 1.5;
            }
            .group:hover .pin-msg {
                color: white;
            }

            .footer {
                padding: 0.75rem;
                background-color: rgba(30, 41, 59, 0.8);
                border-top: 1px solid #334155;
                font-size: 0.625rem;
                color: #64748b;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .italic {
                font-style: italic;
            }
        `,
    ];

    /* State */
    #ercResult: ProjectErcResult | null = null;
    #isOpen = true; // Default open as per design
    #searchTerm = "";
    #filterSeverity: "all" | "error" | "warning" = "all";
    #expandedDesignators = new Set<string>();

    /* Getters/Setters */
    get ercResult() {
        return this.#ercResult;
    }
    set ercResult(v) {
        this.#ercResult = v;
        console.log("ERC Result updated:", v);
        this.update();
    }

    get stats() {
        let errors = 0;
        let warnings = 0;
        if (this.#ercResult?.components) {
            this.#ercResult.components.forEach((comp) => {
                comp.pins.forEach((pin) => {
                    if (pin.severity === "error") errors++;
                    else warnings++;
                });
            });
        }
        return { errors, warnings };
    }

    get filteredComponents() {
        if (!this.#ercResult?.components) return [];
        return this.#ercResult.components
            .map((comp) => ({
                ...comp,
                pins: comp.pins.filter((pin) => {
                    const matchesSeverity =
                        this.#filterSeverity === "all" ||
                        pin.severity === this.#filterSeverity;
                    const matchesSearch = comp.designator
                        .toLowerCase()
                        .includes(this.#searchTerm.toLowerCase());
                    return matchesSeverity && matchesSearch;
                }),
            }))
            .filter((comp) => comp.pins.length > 0);
    }

    override connectedCallback() {
        super.connectedCallback();

        // Global click delegation for the component
        // Attached only once
        this.renderRoot.addEventListener("click", (e: Event) => {
            const target = e.target as HTMLElement;

            // Open (Inspect) Button
            if (target.closest(".inspect-btn")) {
                this.#isOpen = true;
                this.update();
                return;
            }

            // Close Button
            if (target.closest(".close-btn")) {
                this.#isOpen = false;
                this.update();
                return;
            }

            // Stat Buttons
            const statBtn = target.closest(".stat-btn");
            if (statBtn) {
                if (statBtn.classList.contains("error-btn")) {
                    this.#filterSeverity = "error";
                } else if (statBtn.classList.contains("warning-btn")) {
                    this.#filterSeverity = "warning";
                }
                this.update();
                return;
            }

            // Filter Toolbar Buttons
            if (target.closest(".filter-all-btn")) {
                this.#filterSeverity = "all";
                this.update();
                return;
            }
            if (target.closest(".clear-btn")) {
                this.#filterSeverity = "all";
                this.#searchTerm = "";
                this.update();
                return;
            }

            // Component Expand/Collapse and Jump
            const compBtn = target.closest(".comp-btn");
            if (compBtn) {
                const designator = compBtn.getAttribute("data-designator");
                if (designator) {
                    // Check if clicked the toggle icon or the main area
                    // Actually let's just toggle expand AND jump to first pin if not expanded, or just jump to component
                    this.toggleExpand(designator);

                    // Also dispatch jump to component (use first pin or just component uuid lookup in app)
                    // For now, let's jump to the first pin of the component if we have pins,
                    // or just let app find it. App expects 'pin' in detail.
                    if (this.#ercResult) {
                        const comp = this.#ercResult.components.find(
                            (c) => c.designator === designator,
                        );
                        if (comp && comp.pins.length > 0) {
                            // Jump to first pin
                            this.onEntryClick(comp, comp.pins);
                        }
                    }
                }
                return;
            }

            // Pin Click
            const pinItem = target.closest(".pin-item");
            if (pinItem) {
                const designator = pinItem.getAttribute("data-designator");
                const pinNum = pinItem.getAttribute("data-pin");

                if (designator && pinNum && this.#ercResult) {
                    const comp = this.#ercResult.components.find(
                        (c) => c.designator === designator,
                    );
                    const pin = comp?.pins.find((p) => p.pin_num === pinNum);
                    if (comp && pin) {
                        this.onEntryClick(comp, [pin]);
                    }
                }
                // Stop propagation?
                e.stopPropagation();
                return;
            }
        });
    }

    #cursorPos: number | null = null;

    override renderedCallback() {
        super.renderedCallback();

        // Search Input - needs to be re-attached or handled carefully because render kills it
        const searchInput = this.renderRoot.querySelector(
            ".search-input",
        ) as HTMLInputElement;
        if (searchInput) {
            // Remove old listener if possible? Or just rely on GC since old element is gone?
            // "The old element is gone" -> renderRoot.innerHTML replacement usually destroys old nodes.
            // So adding new listener is correct.
            searchInput.addEventListener("input", (e: Event) => {
                const input = e.target as HTMLInputElement;
                this.#searchTerm = input.value;
                this.#cursorPos = input.selectionStart;
                this.update();
            });

            // Only focus if we were searching and it's not the initial open
            if (this.#searchTerm !== "" && this.#isOpen) {
                searchInput.focus();
                if (this.#cursorPos !== null) {
                    searchInput.setSelectionRange(
                        this.#cursorPos,
                        this.#cursorPos,
                    );
                }
            } else if (this.#isOpen && document.activeElement === searchInput) {
                // Keep focus if it was focused (e.g. cleared)
                searchInput.focus();
            }
        }
    }

    override render() {
        if (!this.#ercResult) {
            return html``;
        }

        // Toggle abstract class for positioning
        if (this.#isOpen) {
            this.classList.add("open");
        } else {
            this.classList.remove("open");
        }

        if (!this.#isOpen) {
            return this.renderClosedButton();
        }
        return this.renderPanel();
    }

    renderClosedButton() {
        const stats = this.stats;
        const hasErrors = stats.errors > 0;
        return html`
            <button class="inspect-btn">
                <kc-ui-icon
                    class="${hasErrors ? "text-red-400" : "text-yellow-400"}">
                    ${hasErrors ? "security" : "warning"}
                </kc-ui-icon>
                <span class="font-bold"
                    >${stats.errors + stats.warnings} ERC Issues</span
                >
            </button>
        `;
    }

    renderPanel() {
        return html`
            <div class="panel">
                ${this.renderHeader()} ${this.renderStats()}
                ${this.renderToolbar()} ${this.renderList()}
                ${this.renderFooter()}
            </div>
        `;
    }

    renderHeader() {
        return html`
            <div class="header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <kc-ui-icon class="text-indigo-400"
                        >svg:shield-alert</kc-ui-icon
                    >
                    <h2>ERC Inspector</h2>
                </div>
                <button class="close-btn">
                    <kc-ui-icon>svg:chevron-right</kc-ui-icon>
                </button>
            </div>
        `;
    }

    renderStats() {
        const stats = this.stats;
        return html`
            <div class="stats-grid">
                <button
                    class="stat-btn error-btn ${this.#filterSeverity === "error"
                        ? "active-error"
                        : ""}">
                    <span class="stat-count text-red-400">${stats.errors}</span>
                    <span class="stat-label">Errors</span>
                </button>
                <button
                    class="stat-btn warning-btn ${this.#filterSeverity ===
                    "warning"
                        ? "active-warning"
                        : ""}">
                    <span class="stat-count text-yellow-400"
                        >${stats.warnings}</span
                    >
                    <span class="stat-label">Warnings</span>
                </button>
            </div>
        `;
    }

    renderToolbar() {
        return html`
            <div class="toolbar">
                <div class="search-box">
                    <kc-ui-icon class="search-icon">svg:search</kc-ui-icon>
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Search designator..."
                        value="${this.#searchTerm}" />
                </div>
                <div class="filter-row">
                    <button
                        class="filter-all-btn ${this.#filterSeverity === "all"
                            ? "active"
                            : "inactive"}">
                        ALL ISSUES
                    </button>
                    <button class="clear-btn">CLEAR</button>
                </div>
            </div>
        `;
    }

    renderList() {
        const comps = this.filteredComponents;
        return html`
            <div class="list">
                ${comps.length === 0
                    ? this.renderEmpty()
                    : comps.map((c) => this.renderComponent(c))}
            </div>
        `;
    }

    renderEmpty() {
        return html`
            <div class="empty-state">
                <kc-ui-icon class="empty-icon">check_circle</kc-ui-icon>
                <p style="font-size: 0.875rem;">
                    No issues found in current scope
                </p>
            </div>
        `;
    }

    renderComponent(comp: ComponentERCResult) {
        const isExpanded = this.#expandedDesignators.has(comp.designator);
        return html`
            <div class="comp-item">
                <button class="comp-btn" data-designator="${comp.designator}">
                    <div class="comp-info">
                        <kc-ui-icon>svg:cpu</kc-ui-icon>
                        <span class="designator">${comp.designator}</span>
                        <span class="count-badge">${comp.pins.length}</span>
                    </div>
                    <kc-ui-icon style="font-size: 1rem;"
                        >${isExpanded
                            ? "svg:chevron-down"
                            : "svg:chevron-right"}</kc-ui-icon
                    >
                </button>

                ${isExpanded
                    ? html`
                          <div class="pin-list">
                              ${comp.pins.map((pin) =>
                                  this.renderPin(comp, pin),
                              )}
                          </div>
                      `
                    : ""}
            </div>
        `;
    }

    renderPin(comp: ComponentERCResult, pin: PinCheckResult) {
        return html`
            <div
                class="pin-item group"
                style="border-left-color: ${pin.severity === "error"
                    ? "#f87171"
                    : "#fbbf24"}"
                data-designator="${comp.designator}"
                data-pin="${pin.pin_num}">
                <div class="pin-header">
                    <span class="pin-label">Pin ${pin.pin_num}</span>
                    <kc-ui-icon
                        style="font-size: 0.75rem"
                        class="${pin.severity === "error"
                            ? "text-red-400"
                            : "text-yellow-400"}">
                        ${pin.severity === "error" ? "error" : "warning"}
                    </kc-ui-icon>
                </div>
                <p class="pin-msg">${pin.message}</p>
            </div>
        `;
    }

    renderFooter() {
        return html`
            <div class="footer">
                <span>Project: video_system_revA</span>
                <span class="italic">Click to jump to pin</span>
            </div>
        `;
    }

    toggleExpand(designator: string) {
        if (this.#expandedDesignators.has(designator)) {
            this.#expandedDesignators.delete(designator);
        } else {
            this.#expandedDesignators.add(designator);
        }
        this.update();
    }

    onEntryClick(comp: ComponentERCResult, pins: PinCheckResult[]) {
        this.dispatchEvent(
            new CustomEvent("erc-jump", {
                detail: { designator: comp.designator, pins },
                bubbles: true,
                composed: true,
            }),
        );
    }
}

window.customElements.define("kc-erc-inspector", KCErcInspectorElement);
