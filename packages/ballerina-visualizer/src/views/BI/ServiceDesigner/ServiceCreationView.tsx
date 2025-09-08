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

import { View, ViewContent } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { useEffect, useState } from "react";
import { TitleBar } from "../../../components/TitleBar";
import { isBetaModule } from "../ComponentListView/componentListUtils";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormField, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { LineRange, ServiceInitModel } from "@wso2/ballerina-core";
import { FormHeader } from "../../../components/FormHeader";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import styled from "@emotion/styled";

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
    margin: 20px;
    /* padding: 0 20px 20px; */
    max-width: 600px;
    height: 100%;
    > div:last-child {
        /* padding: 20px 0; */
        > div:last-child {
            justify-content: flex-start;
        }
    }
`;

const FormContainer = styled.div`
    /* padding-top: 15px; */
    padding-bottom: 15px;
`;

export interface ServiceCreationViewProps {
    type: string;
}

interface HeaderInfo {
    title: string;
    moduleName: string;
}

export function ServiceCreationView(props: ServiceCreationViewProps) {

    const { type } = props;
    const { rpcClient } = useRpcContext();

    const [headerInfo, setHeaderInfo] = useState<HeaderInfo>(undefined);
    const [serviceInitModel, setServiceInitModel] = useState<ServiceInitModel>(undefined);
    const [formFields, setFormFields] = useState<FormField[]>(undefined);

    const [filePath, setFilePath] = useState<string>("");
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const MAIN_BALLERINA_FILE = "main.bal";

    useEffect(() => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getServiceInitModel({ filePath: "", moduleName: type, listenerName: "" })
            .then((res) => {
                setHeaderInfo({
                    title: res?.serviceInitModel.displayName,
                    moduleName: res?.serviceInitModel.moduleName
                });
                setServiceInitModel(res?.serviceInitModel);
                setFormFields(mapServiceInitModelToFormFields(res?.serviceInitModel));
            });

        // TODO: Need to handle record config

        rpcClient
            .getVisualizerRpcClient()
            .joinProjectPath(MAIN_BALLERINA_FILE)
            .then((filePath) => {
                setFilePath(filePath);
            });
    }, []);

    useEffect(() => {
        if (filePath && rpcClient) {
            rpcClient
                .getBIDiagramRpcClient()
                .getEndOfFile({ filePath })
                .then((res) => {
                    setTargetLineRange({
                        startLine: res,
                        endLine: res,
                    });
                });
        }
    }, [filePath, rpcClient]);

    const handleOnSubmit = async (data: FormValues, fromImports: FormImports) => {

    }

    return (
        <View>
            <TopNavigationBar />
            {
                headerInfo &&
                <TitleBar title={headerInfo.title} isBetaFeature={isBetaModule(headerInfo.moduleName)} />
            }
            <ViewContent>
                <Container>
                    <>
                        {formFields && formFields.length > 0 &&
                            <FormContainer>
                                <FormHeader title={`${serviceInitModel.displayName} Configuration`} />
                                {filePath && targetLineRange &&
                                    <FormGeneratorNew
                                        fileName={filePath}
                                        targetLineRange={targetLineRange}
                                        fields={formFields}
                                        isSaving={isSaving}
                                        onSubmit={handleOnSubmit}
                                        preserveFieldOrder={true}
                                        recordTypeFields={[]}
                                    />
                                }
                            </FormContainer>
                        }
                    </>
                </Container>
            </ViewContent>
        </View>
    );
}


function mapServiceInitModelToFormFields(model: ServiceInitModel): FormField[] {
    if (!model || !model.properties) return [];

    return Object.entries(model.properties).map(([key, property]) => {

        // Determine value for MULTIPLE_SELECT
        let value: any = property.value;
        if (property.valueType === "MULTIPLE_SELECT") {
            if (property.values && property.values.length > 0) {
                value = property.values;
            } else if (property.value) {
                value = [property.value];
            } else if (property.items && property.items.length > 0) {
                value = [property.items[0]];
            } else {
                value = [];
            }
        }

        return {
            key,
            label: property?.metadata?.label,
            type: property.valueType,
            documentation: property?.metadata?.description || "",
            valueType: property.valueTypeConstraint,
            editable: true,
            enabled: property.enabled ?? true,
            optional: property.optional,
            value,
            valueTypeConstraint: property.valueTypeConstraint,
            advanced: property.advanced,
            diagnostics: [],
            items: property.items,
            choices: property.choices,
            placeholder: property.placeholder,
            addNewButton: property.addNewButton,
            lineRange: property?.codedata?.lineRange
        } as FormField;
    });
}
