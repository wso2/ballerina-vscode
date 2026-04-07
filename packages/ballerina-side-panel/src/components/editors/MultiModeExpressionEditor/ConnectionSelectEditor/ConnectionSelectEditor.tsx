/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useEffect, useState } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { CodeData } from "@wso2/ballerina-core";
import { FormField } from "../../../Form/types";
import { ConnectionIconSelect, ConnectionSelectItem } from "../../ConnectionIconSelect";
import { useFormContext } from "../../../../context";

interface ConnectionSelectEditorProps {
    value: string;
    field: FormField;
    onChange: (value: string, cursorPosition: number) => void;
}

// Cache icon URLs by module name across remounts to avoid icon flicker
const iconUrlCache = new Map<string, string>();
// Cache fetched items by searchNodesKind across remounts to avoid redundant API calls
const itemsCache = new Map<string, ConnectionSelectItem[]>();

function enrichWithCachedIcons(items: ConnectionSelectItem[]): ConnectionSelectItem[] {
    return items.map(item => {
        const module = item.codedata?.module;
        const cachedUrl = module ? iconUrlCache.get(module) : undefined;
        return cachedUrl && !item.iconUrl ? { ...item, iconUrl: cachedUrl } : item;
    });
}

function ensureValueInItems(
    items: ConnectionSelectItem[],
    value: string,
    searchNodesKind?: string,
): ConnectionSelectItem[] {
    if (!value || items.some(item => item.value === value)) {
        return items;
    }
    return [
        ...items,
        {
            id: value,
            label: value,
            value,
            codedata: searchNodesKind ? { node: searchNodesKind } as CodeData : undefined,
        },
    ];
}

export const ConnectionSelectEditor: React.FC<ConnectionSelectEditorProps> = ({ value, field, onChange }) => {
    const { rpcClient } = useRpcContext();
    const { targetLineRange, fileName } = useFormContext();

    const searchNodesKind = field.codedata?.searchNodesKind;
    const initialItems: ConnectionSelectItem[] = field.codedata?.initialItems ?? [];
    const staticItems: ConnectionSelectItem[] = field.codedata?.staticItems ?? [];
    const cachedItems = searchNodesKind ? itemsCache.get(searchNodesKind) : undefined;
    const resolvedItems = [...staticItems, ...(cachedItems ?? enrichWithCachedIcons(initialItems))];
    const [selectItems, setSelectItems] = useState<ConnectionSelectItem[]>(
        ensureValueInItems(resolvedItems, value, searchNodesKind)
    );
    const [loading, setLoading] = useState<boolean>(!!searchNodesKind && !cachedItems);

    const fetchItems = () => {
        if (!searchNodesKind) return;
        // Show loading only if we have no cached items to display
        if (!itemsCache.has(searchNodesKind)) {
            setLoading(true);
        }
        rpcClient.getBIDiagramRpcClient().searchNodes({
            filePath: fileName,
            position: targetLineRange.startLine,
            queryMap: { kind: searchNodesKind }
        }).then((response) => {
            const nodes = response?.output ?? [];
            const items: ConnectionSelectItem[] = nodes
                .filter(node => node.properties?.variable?.value)
                .map(node => {
                    const iconUrl = node.metadata?.icon;
                    const module = node.codedata?.module;
                    if (iconUrl && module) {
                        iconUrlCache.set(module, iconUrl);
                    }
                    return {
                        id: String(node.properties.variable.value),
                        label: node.properties.variable.value as string,
                        value: String(node.properties.variable.value),
                        codedata: node.codedata,
                        iconUrl,
                    };
                });
            itemsCache.set(searchNodesKind, items);
            setSelectItems([...staticItems, ...items]);
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchItems();
    }, [searchNodesKind, fileName]);

    // When value changes to something not in the current items (e.g. after creating
    // a new connection via an overlay), inject a placeholder and re-fetch
    useEffect(() => {
        if (!value || selectItems.some(item => item.value === value)) return;
        setSelectItems(prev => ensureValueInItems(prev, value, searchNodesKind));
        if (searchNodesKind) {
            itemsCache.delete(searchNodesKind);
        }
        fetchItems();
    }, [value]);

    return (
        <>
            <ConnectionIconSelect
                id={field.key}
                items={selectItems}
                value={value}
                required={!field.optional}
                disabled={!field.editable}
                loading={loading}
                onChange={(val) => onChange(val, val?.length)}
            />
        </>
    );
};
