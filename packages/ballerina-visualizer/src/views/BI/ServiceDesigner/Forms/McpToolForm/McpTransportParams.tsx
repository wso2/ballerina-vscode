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
// tslint:disable: jsx-no-multiline-js

import { useState } from "react";
import styled from "@emotion/styled";
import { CheckBox, CheckBoxGroup, Codicon, Divider, LinkButton, Typography } from "@wso2/ui-toolkit";
import { ParameterModel } from "@wso2/ballerina-core";
import { ParamItem } from "../ResourceForm/Parameters/ParamItem";
import { ParamEditor } from "../ResourceForm/Parameters/ParamEditor";

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

const SectionWrapper = styled.div`
    margin-top: 16px;
`;

const AdvancedContent = styled.div`
    margin-top: 8px;
    padding-left: 8px;
`;

// The raw transport types an MCP tool on a Streamable HTTP service may bind. Caller is intentionally
// excluded — the mcp compiler plugin does not allow it in tool methods.
const MCP_ADVANCED_PARAMS: { label: string; type: string }[] = [
    { label: "Request", type: "http:Request" },
    { label: "Headers", type: "http:Headers" }
];

const advancedParamDescriptions: { [key: string]: string } = {
    Request: "Access the complete HTTP request object of the underlying Streamable HTTP transport.",
    Headers: "Access all HTTP headers sent by the client on the underlying Streamable HTTP transport."
};

export function isMcpAdvancedType(typeValue?: string): boolean {
    return MCP_ADVANCED_PARAMS.some((p) => p.type === typeValue);
}

export function isMcpHeaderParam(param: ParameterModel): boolean {
    return param.httpParamType === "HEADER";
}

// Fallback header schema for the "Add Header" editor when the function model does not carry one
// (e.g. when editing an existing tool, whose read-back model only ships the basic parameter schema).
export function buildMcpHeaderSchema(): ParameterModel {
    return {
        metadata: { label: "Header", description: "The Header Parameter" },
        kind: "REQUIRED",
        type: {
            value: "string",
            types: [{ fieldType: "TYPE", selected: true }],
            enabled: true,
            editable: true,
            isType: true,
            optional: false,
            advanced: false
        },
        name: {
            value: "",
            types: [{ fieldType: "IDENTIFIER", selected: true }],
            enabled: true,
            editable: true,
            isType: false,
            optional: true,
            advanced: false
        },
        headerName: {
            value: "",
            types: [{ fieldType: "IDENTIFIER", selected: true }],
            enabled: true,
            editable: true,
            isType: false,
            optional: false,
            advanced: false
        },
        defaultValue: {
            metadata: { label: "Default Value", description: "The default value" },
            value: "",
            types: [{ fieldType: "EXPRESSION", selected: true }],
            enabled: false,
            editable: true,
            isType: false,
            optional: true,
            advanced: false
        },
        enabled: false,
        editable: true,
        optional: false,
        httpParamType: "HEADER"
    } as ParameterModel;
}

function buildMcpAdvancedParam(label: string, type: string): ParameterModel {
    return {
        metadata: { label, description: advancedParamDescriptions[label] },
        kind: "REQUIRED",
        type: {
            value: type,
            types: [{ fieldType: "TYPE", selected: true }],
            enabled: true,
            editable: false,
            isType: true,
            optional: false,
            advanced: false
        },
        name: {
            value: "",
            types: [{ fieldType: "IDENTIFIER", selected: true }],
            enabled: true,
            editable: true,
            isType: false,
            optional: false,
            advanced: false
        },
        enabled: false,
        editable: true,
        optional: true,
        advanced: true
    } as ParameterModel;
}

// Produces the canonical [Request, Headers] advanced param list. An entry present in the model
// (a seed from the new-tool template, or a real param read back from source) is reused as-is; a
// missing entry is synthesised as a disabled template.
export function deriveMcpAdvancedParams(params: ParameterModel[]): ParameterModel[] {
    return MCP_ADVANCED_PARAMS.map(({ label, type }) => {
        const existing = params.find((p) => p.type?.value === type);
        if (existing) {
            return { ...existing, metadata: existing.metadata ?? { label, description: advancedParamDescriptions[label] } };
        }
        return buildMcpAdvancedParam(label, type);
    });
}

export interface McpTransportParamsProps {
    headerSchema: ParameterModel;
    headerParams: ParameterModel[];
    advancedParams: ParameterModel[];
    onHeaderParamsChange: (params: ParameterModel[]) => void;
    onAdvancedParamsChange: (params: ParameterModel[]) => void;
}

export function McpTransportParams(props: McpTransportParamsProps) {
    const { headerSchema, headerParams, advancedParams, onHeaderParamsChange, onAdvancedParamsChange } = props;

    const [editModel, setEditModel] = useState<ParameterModel>(undefined);
    const [isNew, setIsNew] = useState<boolean>(false);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const onAddHeaderClick = () => {
        const newHeader = structuredClone(headerSchema);
        newHeader.httpParamType = "HEADER";
        newHeader.enabled = true;
        newHeader.name.value = "";
        if (newHeader.headerName) {
            newHeader.headerName.value = "";
        }
        setEditModel(newHeader);
        setIsNew(true);
        setEditingIndex(-1);
    };

    const onEditHeader = (param: ParameterModel) => {
        setIsNew(false);
        setEditModel(param);
        setEditingIndex(headerParams.indexOf(param));
    };

    const onChangeHeader = (param: ParameterModel) => {
        setEditModel(param);
        if (!isNew && editingIndex >= 0) {
            const updated = [...headerParams];
            updated[editingIndex] = param;
            onHeaderParamsChange(updated);
        }
    };

    const onSaveHeader = (param: ParameterModel) => {
        param.enabled = true;
        param.httpParamType = "HEADER";
        if (isNew) {
            onHeaderParamsChange([...headerParams, param]);
        } else if (editingIndex >= 0) {
            const updated = [...headerParams];
            updated[editingIndex] = param;
            onHeaderParamsChange(updated);
        }
        setEditModel(undefined);
        setEditingIndex(-1);
        setIsNew(false);
    };

    const onDeleteHeader = (param: ParameterModel) => {
        onHeaderParamsChange(headerParams.filter((p) => p !== param));
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onCancelHeader = () => {
        setEditModel(undefined);
        setEditingIndex(-1);
        setIsNew(false);
    };

    const onAdvancedChecked = (param: ParameterModel, checked: boolean) => {
        const updated = advancedParams.map((p) => {
            if (p.metadata?.label !== param.metadata?.label) {
                return p;
            }
            const next = { ...p, enabled: checked };
            if (checked && !next.name?.value) {
                next.name = { ...next.name, value: param.metadata.label.toLowerCase() };
            }
            return next;
        });
        onAdvancedParamsChange(updated);
    };

    return (
        <div>
            {/* Headers */}
            <SectionWrapper>
                <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Headers</Typography>
                {headerParams.map((param, index) => (
                    <ParamItem
                        key={`mcp-header-${index}`}
                        param={param}
                        onDelete={onDeleteHeader}
                        onEditClick={onEditHeader}
                    />
                ))}
                {editModel && editModel.httpParamType === "HEADER" && (
                    <ParamEditor
                        isNew={isNew}
                        param={editModel}
                        onChange={onChangeHeader}
                        onSave={onSaveHeader}
                        onCancel={onCancelHeader}
                        type="HEADER"
                    />
                )}
                <AddButtonWrapper>
                    <LinkButton
                        sx={editModel ? { opacity: 0.5, pointerEvents: "none" } : {}}
                        onClick={editModel ? undefined : onAddHeaderClick}
                    >
                        <Codicon name="add" />
                        <>Header</>
                    </LinkButton>
                </AddButtonWrapper>
            </SectionWrapper>

            {/* Advanced transport parameters */}
            {advancedParams.length > 0 && (
                <SectionWrapper>
                    <Typography sx={{ marginBlockEnd: 4 }} variant="h4">Advanced Parameters</Typography>
                    <AdvancedContent>
                        <CheckBoxGroup direction="vertical">
                            {advancedParams.map((param, index) => (
                                <CheckBox
                                    key={`mcp-advanced-${index}`}
                                    label={param.metadata?.label}
                                    checked={param.enabled}
                                    onChange={(checked) => onAdvancedChecked(param, checked)}
                                    sx={{ description: advancedParamDescriptions[param.metadata?.label] }}
                                />
                            ))}
                        </CheckBoxGroup>
                    </AdvancedContent>
                </SectionWrapper>
            )}
            <Divider />
        </div>
    );
}
