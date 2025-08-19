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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormField, FormValues, FormImports } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { convertConfig } from "../../utils/bi";
import { FormGeneratorNew } from "../../views/BI/Forms/FormGeneratorNew";
import { RelativeLoader } from "../RelativeLoader";
import { InfoBox } from "../InfoBox";
import { ConnectionCreatorProps } from "./types";
import { getConnectionSpecialConfig } from "./config";
import { updateFormFieldsWithData, updateNodeTemplateProperties, updateNodeWithConnectionVariable } from "./utils";
import { LoaderContainer } from "./styles";
import { cloneDeep } from "lodash";

export function ConnectionCreator(props: ConnectionCreatorProps): JSX.Element {
    const { connectionKind, selectedNode, nodeFormTemplate, onSave } = props;

    const connectionSymbol = useMemo(() => nodeFormTemplate?.codedata?.symbol || '', [nodeFormTemplate?.codedata?.symbol]);
    const specialConfig = useMemo(() => getConnectionSpecialConfig(connectionSymbol) || {}, [connectionSymbol]);
    const shouldShowInfo = useMemo(() => specialConfig.shouldShowInfo?.(connectionSymbol) ?? false, [specialConfig, connectionSymbol]);

    const { rpcClient } = useRpcContext();
    const [connectionFields, setConnectionFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const projectPath = useRef<string>("");

    useEffect(() => {
        initPanel();
    }, [nodeFormTemplate]);

    const initPanel = async () => {
        setLoading(true);
        projectPath.current = await rpcClient.getVisualizerLocation().then((location) => location.projectUri);
        if (nodeFormTemplate && nodeFormTemplate.properties) {
            const fields = convertConfig(nodeFormTemplate.properties);
            setConnectionFields(fields);
        }
        setLoading(false);
    };

    const handleOnSave = useCallback(async (data: FormValues, formImports?: FormImports) => {
        setSavingForm(true);
        const nodeTemplate = cloneDeep(nodeFormTemplate);
        updateFormFieldsWithData(connectionFields, data, formImports);
        updateNodeTemplateProperties(nodeTemplate, connectionFields);
        try {
            await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: projectPath.current, flowNode: nodeTemplate });
            updateNodeWithConnectionVariable(connectionKind, selectedNode, nodeTemplate?.properties?.variable?.value as string);
            onSave?.(selectedNode);
        } catch (error) {
            console.error(`>>> Error creating ${connectionKind.toLowerCase()}`, error);
        }
    }, [onSave, rpcClient, connectionKind, connectionFields]);

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && connectionFields?.length > 0 && (
                <>
                    <FormGeneratorNew
                        fileName={projectPath.current}
                        fields={connectionFields}
                        onSubmit={handleOnSave}
                        submitText={savingForm ? "Saving..." : "Save"}
                        compact={true}
                        disableSaveButton={savingForm}
                        helperPaneSide="left"
                        isSaving={savingForm}
                        injectedComponents={shouldShowInfo && specialConfig.infoMessage ? [
                            {
                                component: <InfoBox
                                    text={specialConfig.infoMessage.text}
                                    description={specialConfig.infoMessage.description}
                                    codeCommand={specialConfig.infoMessage.codeCommand}
                                />,
                                index: 0
                            }
                        ] : []}
                    />
                </>
            )}
        </>
    );
}
