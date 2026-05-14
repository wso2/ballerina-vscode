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
import styled from "@emotion/styled";
import { Codicon, LinkButton } from "@wso2/ui-toolkit";
import { AllowedConnector, CodeData } from "@wso2/ballerina-core";

import { FormField } from "../../Form/types";
import { useFormContext } from "../../../context";
import { capitalize } from "../utils";
import { ConnectionSelectEditor, ConnectorFilter } from "../MultiModeExpressionEditor/ConnectionSelectEditor/ConnectionSelectEditor";
import { CreateConnectionOverlay } from "./CreateConnectionOverlay";

interface ConnectionEditorProps {
    field: FormField;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
`;

const Label = styled.label`
    font-size: 13px;
    color: var(--vscode-editor-foreground);
`;

const Required = styled.span`
    color: var(--vscode-errorForeground);
    margin-left: 2px;
`;

const Description = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const AddButtons = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 6px;
`;

export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({ field }) => {
    const { form } = useFormContext();
    const { register, setValue, watch } = form;
    const [activeConnector, setActiveConnector] = useState<AllowedConnector | null>(null);

    useEffect(() => {
        register(field.key, {
            required: !field.optional,
            value: field.value ?? "",
        });
    }, [field.key]);

    const value = (watch(field.key) ?? field.value ?? "") as string;
    const connectors: AllowedConnector[] = field.metadata?.connectors ?? [];
    const connectorFilters: ConnectorFilter[] | undefined = connectors.length > 0
        ? connectors.map(c => ({ module: c.codedata?.module, object: c.codedata?.object }))
        : undefined;

    const handleChange = (val: string) => {
        setValue(field.key, val, { shouldDirty: true, shouldValidate: true });
        field.onValueChange?.(val);
    };

    const handleSaved = (variableName: string) => {
        setActiveConnector(null);
        setValue(field.key, variableName, { shouldDirty: true, shouldValidate: true });
        field.onValueChange?.(variableName);
    };

    return (
        <Container>
            <Label htmlFor={field.key}>
                {capitalize(field.label)}
                {!field.optional && <Required>*</Required>}
            </Label>
            {field.documentation && <Description>{field.documentation}</Description>}
            <ConnectionSelectEditor
                value={value}
                field={field}
                onChange={(val) => handleChange(val)}
                connectorFilters={connectorFilters}
            />
            {connectors.length > 0 && (
                <AddButtons>
                    {connectors.map((c, i) => (
                        <LinkButton
                            key={`${c.codedata?.module}-${c.codedata?.object}-${i}`}
                            onClick={() => setActiveConnector(c)}
                            sx={{ padding: "4px 6px", margin: 0, fontSize: "13px" }}
                        >
                            <Codicon name="add" />
                            {c.addNewConnectionLabel}
                        </LinkButton>
                    ))}
                </AddButtons>
            )}
            {activeConnector && (
                <CreateConnectionOverlay
                    connector={activeConnector.codedata as CodeData}
                    title={activeConnector.addNewConnectionLabel}
                    onClose={() => setActiveConnector(null)}
                    onSaved={handleSaved}
                />
            )}
        </Container>
    );
};
