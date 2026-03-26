/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
    tableEditing,
    columnResizing,
    goToNextCell,
    fixTables,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    addRowBefore,
    addRowAfter,
    deleteRow,
    deleteTable,
    CellSelection
} from "prosemirror-tables";
import { keymap } from "prosemirror-keymap";
import { EditorState, NodeSelection } from "prosemirror-state";

// Delete the entire table when cells are selected and Backspace/Delete is pressed.
// When cursor is adjacent to a table, first press selects it, second deletes it.
const handleTableDelete = (state: EditorState, dispatch?: (tr: any) => void): boolean => {
    const sel = state.selection;
    console.log("[tableDelete] ---- Backspace/Delete pressed ----");
    console.log("[tableDelete] selection type:", sel.constructor.name);
    console.log("[tableDelete] from:", sel.from, "to:", sel.to, "empty:", sel.empty);
    console.log("[tableDelete] isCellSelection:", sel instanceof CellSelection);
    console.log("[tableDelete] isNodeSelection:", sel instanceof NodeSelection);
    console.log("[tableDelete] isInTable:", isInTable(state));
    console.log("[tableDelete] dispatch provided:", !!dispatch);

    // Walk the depth chain
    for (let d = sel.$from.depth; d >= 0; d--) {
        const node = sel.$from.node(d);
        console.log(`[tableDelete] depth ${d}: ${node.type.name} (textContent.length=${node.textContent.length})`);
    }

    // Check for CellSelection by constructor name (bundling can rename the class)
    const isCellSel = sel instanceof CellSelection ||
        sel.constructor.name === "_CellSelection" ||
        sel.constructor.name === "CellSelection";

    // If cells are selected, check if all cells are selected
    if (isCellSel) {
        // Count total cells in the table vs selected cells
        const $anchor = sel.$anchorCell || (sel as any).$anchorCell;
        let tableNode = null;
        let tableDepth = 0;
        if ($anchor) {
            for (let d = $anchor.depth; d >= 0; d--) {
                if ($anchor.node(d).type.name === "table") {
                    tableNode = $anchor.node(d);
                    tableDepth = d;
                    break;
                }
            }
        }

        if (tableNode) {
            let totalCells = 0;
            tableNode.descendants((node: any) => {
                if (node.type.name === "table_cell" || node.type.name === "table_header") {
                    totalCells++;
                }
            });

            // Count selected cells by checking the ranges
            const ranges = (sel as any).ranges;
            const selectedCells = ranges ? ranges.length : 0;

            console.log("[tableDelete] CellSelection: totalCells:", totalCells, "selectedCells:", selectedCells);

            if (selectedCells >= totalCells) {
                // All cells selected — delete entire table
                console.log("[tableDelete] -> all cells selected, deleting table");
                return deleteTable(state, dispatch);
            } else {
                // Figure out if selection is row-shaped or column-shaped
                const colCount = tableNode.firstChild ? tableNode.firstChild.childCount : 0;
                const rowCount = tableNode.childCount;

                const isFullRows = colCount > 0 && selectedCells % colCount === 0;
                const isFullCols = rowCount > 0 && selectedCells % rowCount === 0;

                if (isFullCols && (!isFullRows || selectedCells / rowCount <= selectedCells / colCount)) {
                    console.log("[tableDelete] -> column selection, deleting column");
                    return deleteColumn(state, dispatch);
                } else {
                    console.log("[tableDelete] -> row selection, deleting row");
                    return deleteRow(state, dispatch);
                }
            }
        }
    }

    // If a table node is already selected (via NodeSelection), delete it
    const isNodeSel = sel instanceof NodeSelection ||
        sel.constructor.name === "_NodeSelection" ||
        sel.constructor.name === "NodeSelection";
    if (isNodeSel && (sel as any).node?.type.name === "table") {
        console.log("[tableDelete] -> NodeSelection on table: deleting");
        if (dispatch) {
            dispatch(state.tr.deleteSelection().scrollIntoView());
        }
        return true;
    }

    // If cursor is inside a table and the current cell is empty, select the table
    if (isInTable(state)) {
        const { $from } = sel;
        for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "table_cell" || node.type.name === "table_header") {
                console.log("[tableDelete] found cell at depth", d, "textContent:", JSON.stringify(node.textContent), "length:", node.textContent.length);
                if (node.textContent.length === 0) {
                    for (let td = d - 1; td >= 0; td--) {
                        if ($from.node(td).type.name === "table") {
                            const tablePos = $from.before(td);
                            console.log("[tableDelete] -> empty cell: selecting table at pos", tablePos);
                            if (dispatch) {
                                try {
                                    dispatch(state.tr.setSelection(
                                        NodeSelection.create(state.doc, tablePos)
                                    ).scrollIntoView());
                                    console.log("[tableDelete] -> dispatch succeeded");
                                } catch (e) {
                                    console.error("[tableDelete] -> dispatch failed:", e);
                                }
                            }
                            return true;
                        }
                    }
                }
                console.log("[tableDelete] -> cell not empty, passing through");
                break;
            }
        }
        return false;
    }

    // If cursor is right after a table, select the table node
    const { $from } = sel;
    const posBefore = $from.before($from.depth);
    console.log("[tableDelete] outside table. posBefore:", posBefore);
    if (posBefore > 0) {
        const nodeBefore = state.doc.resolve(posBefore).nodeBefore;
        console.log("[tableDelete] nodeBefore:", nodeBefore?.type.name);
        if (nodeBefore && nodeBefore.type.name === "table") {
            const tablePos = posBefore - nodeBefore.nodeSize;
            console.log("[tableDelete] -> selecting table at pos", tablePos);
            if (dispatch) {
                dispatch(state.tr.setSelection(NodeSelection.create(state.doc, tablePos)).scrollIntoView());
            }
            return true;
        }
    }

    console.log("[tableDelete] -> not handled");
    return false;
};

export function createTablePlugins() {
    return [
        columnResizing(),
        // Table delete keymap must come BEFORE tableEditing() which has its own
        // Backspace handler that clears cell content instead of deleting the table
        keymap({
            "Backspace": handleTableDelete,
            "Delete": handleTableDelete,
        }),
        tableEditing(),
        keymap({
            "Tab": goToNextCell(1),
            "Shift-Tab": goToNextCell(-1),
        })
    ];
}

export const insertTable = (rows: number, cols: number) => {
    return (state: EditorState, dispatch?: (tr: any) => void): boolean => {
        const { table, table_row, table_cell, table_header } = state.schema.nodes;
        if (!table || !table_row || !table_cell || !table_header) return false;

        const headerCells = [];
        for (let j = 0; j < cols; j++) {
            headerCells.push(table_header.createAndFill({ alignment: null })!);
        }
        const headerRow = table_row.create(null, headerCells);

        const bodyRows = [];
        for (let i = 1; i < rows; i++) {
            const cells = [];
            for (let j = 0; j < cols; j++) {
                cells.push(table_cell.createAndFill({ alignment: null })!);
            }
            bodyRows.push(table_row.create(null, cells));
        }

        const tableNode = table.create(null, [headerRow, ...bodyRows]);

        if (dispatch) {
            const tr = state.tr.replaceSelectionWith(tableNode);
            dispatch(tr.scrollIntoView());
        }
        return true;
    };
};

export function isInTable(state: EditorState): boolean {
    const $from = state.selection.$from;
    for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === "table") {
            return true;
        }
    }
    return false;
}

export {
    fixTables,
    addColumnBefore,
    addColumnAfter,
    deleteColumn,
    addRowBefore,
    addRowAfter,
    deleteRow,
    deleteTable
};
