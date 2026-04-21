/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { KCUIElement } from "../../../kc-ui";
import { css, html } from "../../../base/web-components";
import "./viewer";
import type { Project } from "../../project";
import type { BomItem } from "../../../kicad/bom_item";

export class BomViewer extends KCUIElement {
    #project: Project;

    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                margin: 0;
                display: flex;
                position: relative;
                width: 100%;
                height: 100%;
                aspect-ratio: 1.414;
                background-color: white;
                color: var(--fg);
                contain: layout paint;
            }

            .vertical {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                table-layout: auto;
                text-align: left; /* Add this line */
            }
            th,
            td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                overflow: hidden;
                word-wrap: break-word;
                color: black;
                text-align: left;
                vertical-align: top;
                word-break: break-word; /* Add this line */
                white-space: normal; /* Add this line */
            }

            th {
                top: 0;
                position: sticky;
                background: #666;
            }

            /* Adjust column widths */
            th:nth-child(1),
            td:nth-child(1) {
                /* Index */
                width: 5%;
            }
            th:nth-child(2),
            td:nth-child(2) {
                /* Name */
                width: 15%;
            }
            th:nth-child(3),
            td:nth-child(3) {
                /* Description */
                width: 35%;
            }
            th:nth-child(4),
            td:nth-child(4) {
                /* Footprint */
                width: 15%;
            }
            th:nth-child(5),
            td:nth-child(5) {
                /* Reference */
                width: 25%;
            }
            th:nth-child(6),
            td:nth-child(6) {
                /* Quantity */
                width: 5%;
            }
            #summary {
                color: white;
                text-align: right;
                background: #666;
            }
            tr:nth-child(odd) {
                background-color: #f9f9f9; /* Alternative color for odd rows */
            }
            tr:nth-child(even) {
                background-color: #ffffff; /* Background color for even rows */
            }
            ::-webkit-scrollbar {
                position: absolute;
                width: 6px;
                height: 6px;
                margin-left: -6px;
                background: var(--scrollbar-bg);
            }

            ::-webkit-scrollbar-thumb {
                position: absolute;
                background: var(--scrollbar-fg);
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--scrollbar-hover-fg);
            }

            ::-webkit-scrollbar-thumb:active {
                background: var(--scrollbar-active-fg);
            }
        `,
    ];

    override connectedCallback() {
        (async () => {
            this.#project = await this.requestContext("project");
            await this.#project.loaded;
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {}
    generateBomItemHtml(bomItem: BomItem, index: number) {
        return html`
            <tr>
                <td>${index}</td>
                <td>${bomItem.Name}</td>
                <td>${bomItem.Description}</td>
                <td>${bomItem.Footprint}</td>
                <td>${bomItem.Reference}</td>
                <td>${bomItem.Qty}</td>
            </tr>
        `;
    }
    override render() {
        const table = html`<table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Value</th>
                    <!-- <th>Price</th> -->
                    <th>Description</th>
                    <th>Footprint</th>
                    <th>Designator</th>
                    <th>Quantity</th>
                </tr>
            </thead>
        </table>`;

        const body = html`<tbody id="bomItemsBody"></tbody>`;

        let total_cp = 0;
        const bom_items = this.#project.bom_items!;
        for (let i = 0; i < bom_items.length; i++) {
            const it = bom_items[i]!;
            body.appendChild(this.generateBomItemHtml(it, i + 1));
            total_cp += it.Qty;
        }

        table.appendChild(body);
        const headerCells = table.querySelectorAll("th");
        const bodyCells = table.querySelectorAll("td");

        headerCells.forEach((cell, index) => {
            const headerWidth = cell.getBoundingClientRect().width;
            const bodyWidth =
                bodyCells[index]?.getBoundingClientRect().width ?? headerWidth;
            const maxWidth = Math.max(headerWidth, bodyWidth);
            cell.style.width = maxWidth + "px";
        });
        return html`
            <!-- <kc-ui-panel-title title="Nets"></kc-ui-panel-title> -->
            <div class="vertical">
                <kc-ui-panel-body> ${table} </kc-ui-panel-body>
                <p id="summary">Total: ${total_cp} Price: N/A</p>
            </div>
        `;
    }
}

window.customElements.define("bom-viewer", BomViewer);
