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
import { FormField } from "../../../Form/types";
import { ConnectionIconSelect, ConnectionSelectItem } from "../../ConnectionIconSelect";
import { useFormContext } from "../../../../context";
import { LinkButton } from "@wso2/ui-toolkit/lib/components/LinkButton/LinkButton";

interface ConnectionSelectEditorProps {
    value: string;
    field: FormField;
    onChange: (value: string, cursorPosition: number) => void;
}

const actionButtonStyles = {
    padding: "4px 6px",
    margin: 0,
    marginTop: "6px",
    fontSize: "13px",
};

export const ConnectionSelectEditor: React.FC<ConnectionSelectEditorProps> = ({ value, field, onChange }) => {
    const { rpcClient } = useRpcContext();
    const { targetLineRange, fileName } = useFormContext();

    const searchNodesKind = field.codedata?.searchNodesKind;
    const initialItems: ConnectionSelectItem[] = field.codedata?.initialItems ?? [];
    const [selectItems, setSelectItems] = useState<ConnectionSelectItem[]>(initialItems);

    useEffect(() => {
        if (!searchNodesKind) return;
        rpcClient.getBIDiagramRpcClient().searchNodes({
            filePath: fileName,
            position: targetLineRange.startLine,
            queryMap: { kind: searchNodesKind }
        }).then((response) => {
            const nodes = response?.output ?? [];
            const items: ConnectionSelectItem[] = nodes
                .filter(node => node.properties?.variable?.value)
                .map(node => ({
                    id: String(node.properties.variable.value),
                    label: node.properties.variable.value as string,
                    value: String(node.properties.variable.value),
                    codedata: node.codedata,
                }));
            setSelectItems(items);
        });
    }, [searchNodesKind, fileName]);

    return (
        <>
            <ConnectionIconSelect
                id={field.key}
                items={selectItems}
                value={value}
                required={!field.optional}
                disabled={!field.editable}
                onChange={(val) => onChange(val, val?.length)}
            />
        </>
    );
};
