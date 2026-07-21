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

import { useEffect, useState } from "react";
import {
    FunctionNode,
    NodeKind,
    NodeProperties,
    getPrimaryInputType,
    isTemplateType,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormField, FormImports, FormValues, Parameter } from "@wso2/ballerina-side-panel";
import ArtifactForm from "../Forms/ArtifactForm";
import { convertConfig, getImportsForProperty } from "../../../utils/bi";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { LoaderContainer } from "../../../components/RelativeLoader/styles";

interface AgentIdentifierPanelProps {
    /** Name of the durable agent function (the agent identifier). */
    agentName: string;
    /** File of the flow model currently open (used to resolve the function). */
    fileName: string;
    projectPath: string;
    /** Called after a successful save — closes the panel and refreshes the flow model. */
    onSave: () => void;
}

/**
 * Side-panel form for editing a durable agent's identifier: name, description and the
 * input parameter (type + name). This drives the same function-signature update the
 * full-page FunctionForm uses: fetch the function node, set the edited property values
 * and regenerate the source with getSourceCode(isFunctionNodeUpdate).
 */
export function AgentIdentifierPanel(props: AgentIdentifierPanelProps) {
    const { agentName, fileName, projectPath, onSave } = props;
    const { rpcClient } = useRpcContext();

    const [functionNode, setFunctionNode] = useState<FunctionNode | undefined>(undefined);
    const [fields, setFields] = useState<FormField[]>([]);
    const [filePath, setFilePath] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        const fetchFunctionNode = async () => {
            setLoading(true);
            try {
                const response = await rpcClient.getBIDiagramRpcClient().getFunctionNode({
                    functionName: agentName,
                    fileName: fileName?.split(/[\\/]/).pop(),
                    projectPath,
                });
                if (cancelled || !response?.functionDefinition) {
                    return;
                }
                // Use the DURABLE_AGENT builder when regenerating the signature.
                const flowNode = {
                    ...response.functionDefinition,
                    codedata: { ...response.functionDefinition.codedata, node: "DURABLE_AGENT" as NodeKind },
                };
                const functionFileName = flowNode.codedata?.lineRange?.fileName;
                const pathResponse = await rpcClient
                    .getVisualizerRpcClient()
                    .joinProjectPath({ segments: [functionFileName?.split(/[\\/]/).pop()] });
                if (cancelled) {
                    return;
                }
                setFilePath(pathResponse.filePath);
                setFunctionNode(flowNode);
                setFields(buildAgentIdentifierFields(flowNode));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        fetchFunctionNode();
        return () => {
            cancelled = true;
        };
    }, [agentName, fileName, projectPath, rpcClient]);

    const handleSubmit = async (data: FormValues, formImports?: FormImports) => {
        if (!functionNode) {
            return;
        }
        setSaving(true);
        try {
            // HACK: keep description fields single line (mirrors FunctionForm).
            if (data.functionNameDescription) {
                data.functionNameDescription = data.functionNameDescription.replace(/\n/g, " ");
            }

            const nodeCopy = { ...functionNode };
            for (const [dataKey, dataValue] of Object.entries(data)) {
                const properties = nodeCopy.properties as NodeProperties;
                for (const [key, property] of Object.entries(properties)) {
                    if (dataKey !== key) {
                        continue;
                    }
                    const primaryType = getPrimaryInputType(property.types);
                    if (primaryType?.fieldType === "REPEATABLE_PROPERTY" && isTemplateType(primaryType)) {
                        // Rebuild the parameters map from the form's parameter list
                        // (includes the hidden AgentContext parameter untouched).
                        const template = primaryType.template;
                        property.value = {};
                        for (const repeatValue of Object.values(dataValue as Record<string, any>)) {
                            const valueConstraint = JSON.parse(JSON.stringify(template));
                            for (const [paramKey, param] of Object.entries(
                                (valueConstraint as any).value as NodeProperties
                            )) {
                                param.value = (repeatValue as any).formValues[paramKey] || "";
                            }
                            (property.value as any)[(repeatValue as any).key] = valueConstraint;
                        }
                    } else {
                        property.value = dataValue;
                    }
                    property.imports = getImportsForProperty(key, formImports);
                }
            }

            const sourceCode = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath, flowNode: nodeCopy, isFunctionNodeUpdate: true });
            if (!sourceCode.artifacts?.length) {
                await rpcClient
                    .getCommonRpcClient()
                    .showErrorMessage({ message: "Failed to update the durable agent." });
                return;
            }
            onSave();
        } catch (error) {
            console.error(">>> Error updating durable agent identifier", error);
            await rpcClient
                .getCommonRpcClient()
                .showErrorMessage({ message: "Failed to update the durable agent." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <LoaderContainer>
                <RelativeLoader />
            </LoaderContainer>
        );
    }

    return (
        <>
            {filePath && fields.length > 0 && functionNode && (
                <ArtifactForm
                    fileName={filePath}
                    nestedForm={true}
                    targetLineRange={functionNode.codedata.lineRange}
                    fields={fields}
                    isSaving={saving}
                    onSubmit={handleSubmit}
                    submitText={saving ? "Saving..." : "Save"}
                    selectedNode={"DURABLE_AGENT" as NodeKind}
                    preserveFieldOrder={true}
                />
            )}
        </>
    );
}

/**
 * Trims the function-definition fields down to the agent identifier essentials:
 * Name, Description and the input parameter (type + name). Hides the Public checkbox,
 * return type fields, the workflow:AgentContext context parameter row and the
 * Add Parameter action.
 */
function buildAgentIdentifierFields(functionNode: FunctionNode): FormField[] {
    const fields = convertConfig(functionNode.properties);

    const isContextParam = (param: Parameter) =>
        typeof param?.formValues?.type === "string" &&
        param.formValues.type.replace(/\s/g, "").endsWith("AgentContext");

    fields.forEach((field) => {
        if (
            field.key === "isPublic" ||
            field.key === "type" ||
            field.key === "typeDescription" ||
            field.key === "isIsolated"
        ) {
            field.hidden = true;
        }
        if (field.key === "functionNameDescription") {
            field.type = "DOC_TEXT";
        }
        if (field.key === "parameters") {
            field.addNewButton = false;
            field.paramManagerProps?.paramValues?.forEach((param) => {
                if (isContextParam(param)) {
                    param.hidden = true;
                }
            });
            if (Array.isArray(field.value)) {
                (field.value as Parameter[]).forEach((param) => {
                    if (isContextParam(param)) {
                        param.hidden = true;
                    }
                });
            }
        }
    });

    return fields;
}
