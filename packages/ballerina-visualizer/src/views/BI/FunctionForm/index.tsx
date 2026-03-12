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

import { useEffect, useRef, useState } from "react";
import { FunctionNode, LineRange, NodeKind, NodeProperties, NodePropertyKey, DIRECTORY_MAP, EVENT_TYPE, getPrimaryInputType, isTemplateType } from "@wso2/ballerina-core";
import { Button, Codicon, Typography, View, ViewContent } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormField, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { FormHeader } from "../../../components/FormHeader";
import { convertConfig, getImportsForProperty } from "../../../utils/bi";
import { BodyText, LoadingContainer, TopBar } from "../../styles";
import { LoadingRing } from "../../../components/Loader";

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    gap: 20px;
`;

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
`;

interface FunctionFormProps {
    filePath: string;
    projectPath: string;
    functionName: string;
    isDataMapper?: boolean;
    isNpFunction?: boolean;
    isAutomation?: boolean;
    isPopup?: boolean;
}

export function FunctionForm(props: FunctionFormProps) {
    const { rpcClient } = useRpcContext();
    const { projectPath, functionName, filePath, isDataMapper, isNpFunction, isAutomation, isPopup } = props;

    const [functionFields, setFunctionFields] = useState<FormField[]>([]);
    const [functionNode, setFunctionNode] = useState<FunctionNode>(undefined);
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [titleSubtitle, setTitleSubtitle] = useState<string>("");
    const [formSubtitle, setFormSubtitle] = useState<string>("");
    const [saving, setSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const fileName = filePath.split(/[\\/]/).pop();
    const formType = useRef("Function");

    useEffect(() => {
        let nodeKind: NodeKind;
        if (isAutomation || functionName === "main") {
            nodeKind = 'AUTOMATION';
            formType.current = "Automation";
            setTitleSubtitle('An automation that can be invoked periodically or manually');
            setFormSubtitle('Periodic invocation should be scheduled in an external system such as cronjob, k8s, or Devant');
        } else if (isDataMapper) {
            nodeKind = 'DATA_MAPPER_DEFINITION';
            formType.current = 'Data Mapper';
            setTitleSubtitle('Transform data between different data types');
            setFormSubtitle('Create mappings on how to convert the inputs into a single output');
        } else if (isNpFunction) {
            nodeKind = 'NP_FUNCTION_DEFINITION';
            formType.current = 'Natural Function';
            setTitleSubtitle('Build a flow using a natural language description');
            setFormSubtitle('Describe what you need in a prompt and let AI handle the implementation');
        } else {
            nodeKind = 'FUNCTION_DEFINITION';
            formType.current = 'Function';
            setTitleSubtitle('Build reusable custom flows');
            setFormSubtitle('Define a flow that can be used within your integration');
        }
        if (functionName) {
            getExistingFunctionNode();
        } else {
            getFunctionNode(nodeKind);
        }
    }, [isDataMapper, isNpFunction, isAutomation, functionName]);

    useEffect(() => {
        let fields = functionNode ? convertConfig(functionNode.properties) : [];

        // TODO: Remove this once the hidden flag is implemented 
        if (isAutomation || functionName === "main") {
            formType.current = "Automation";
            const automationFields = fields.filter(field => field.key !== "functionName" && field.key !== "type");
            fields = automationFields;
        }

        const annotations = functionNode?.properties?.annotations?.value;
        if (typeof annotations === "string" && annotations.includes("@ai:AgentTool")) {
            formType.current = "Agent Tool";
            setTitleSubtitle('Build a tool that can be used by AI agents');
            setFormSubtitle('Define the inputs and outputs of the tool');
        }

        // update description fields as "TEXTAREA"
        fields.forEach((field) => {
            const primaryInputType = getPrimaryInputType(field.types)
            if (field.key === "functionNameDescription" || field.key === "typeDescription") {
                field.type = "DOC_TEXT";
            }
            if (field.key === "parameters" && primaryInputType && isTemplateType(primaryInputType)) {
                if ((primaryInputType.template as any).value.parameterDescription) {
                    (primaryInputType.template as any).value.parameterDescription.type = "TEXTAREA";
                }
            }
        });

        setFunctionFields(fields);
    }, [functionNode]);

    const getFunctionNode = async (kind: NodeKind) => {
        setIsLoading(true);
        const filePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [fileName] })).filePath;
        const res = await rpcClient
            .getBIDiagramRpcClient()
            .getNodeTemplate({
                position: { line: 0, offset: 0 },
                filePath: filePath,
                id: { node: kind },
            });
        let flowNode = res.flowNode;
        if (isNpFunction) {
            /* 
            * TODO: Remove this once the LS is updated
            * HACK: Add the advanced fields under parameters.advanceProperties
            */
            // Get all the advanced fields
            let properties = flowNode.properties as NodeProperties;
            const advancedProperties = Object.fromEntries(
                Object.entries(properties).filter(([_, property]) => property.advanced)
            );
            // Remove the advanced fields from properties
            properties = Object.fromEntries(
                Object.entries(properties).filter(([_, property]) => !property.advanced)
            );
            flowNode.properties = properties;

            // Add the all the advanced fields to advanceProperties
            flowNode.properties.parameters = {
                ...flowNode.properties.parameters,
                advanceProperties: advancedProperties
            }
        }

        setFunctionNode(flowNode);
        setIsLoading(false);
        console.log("Function Node: ", flowNode);
    }

    const getExistingFunctionNode = async () => {
        setIsLoading(true);
        const res = await rpcClient
            .getBIDiagramRpcClient()
            .getFunctionNode({
                functionName,
                fileName,
                projectPath
            });
        let flowNode = res.functionDefinition;
        if (isNpFunction) {
            /* 
            * TODO: Remove this once the LS is updated
            * HACK: Add the advanced fields under parameters.advanceProperties
            */
            // Get all the advanced fields
            let properties = flowNode.properties as NodeProperties;
            const advancedProperties = Object.fromEntries(
                Object.entries(properties).filter(([_, property]) => property.advanced)
            );
            // Remove the advanced fields from properties
            properties = Object.fromEntries(
                Object.entries(properties).filter(([_, property]) => !property.advanced)
            );
            flowNode.properties = properties;

            // Add the all the advanced fields to advanceProperties
            flowNode.properties.parameters = {
                ...flowNode.properties.parameters,
                advanceProperties: advancedProperties
            }
        }

        setFunctionNode(flowNode);
        setIsLoading(false);
        console.log("Existing Function Node: ", flowNode);
    }

    const onSubmit = async (data: FormValues, formImports?: FormImports) => {
        console.log("Function Form Data: ", data);
        const functionNodeCopy = { ...functionNode };

        /**
         * TODO: Remove this once the LS is updated
         * HACK: Add the advanced fields under parameters.advanceProperties back to properties
         */
        if (isNpFunction) {
            // Add values back to properties
            const properties = functionNodeCopy.properties;
            functionNodeCopy.properties = {
                ...properties,
                ...properties.parameters.advanceProperties,
            }

            // Remove the advanceProperties from parameters
            delete properties.parameters.advanceProperties;
        }

        if (isNpFunction) {
            // Handle advance properties
            const enrichFlowNodeForAdvanceProperties = (data: FormValues) => {
                for (const value of Object.values(data)) {
                    if (!value) continue;
                    const nestedData = value.advanceProperties;
                    if (nestedData) {
                        for (const [advanceKey, advanceValue] of Object.entries(nestedData)) {
                            functionNodeCopy.properties[advanceKey as NodePropertyKey].value = advanceValue;
                        }

                        delete value.advanceProperties;
                    }
                }
            }

            enrichFlowNodeForAdvanceProperties(data);
        }

        for (const [dataKey, dataValue] of Object.entries(data)) {
            const properties = functionNodeCopy.properties as NodeProperties;
            for (const [key, property] of Object.entries(properties)) {
                if (dataKey === key) {
                    const primaryType = getPrimaryInputType(property.types);
                    if (primaryType?.fieldType === "REPEATABLE_PROPERTY" && isTemplateType(primaryType)) {
                        const template = primaryType?.template;
                        property.value = {};
                        // Go through the parameters array
                        for (const [repeatKey, repeatValue] of Object.entries(dataValue)) {
                            // Create a deep copy for each iteration
                            const valueConstraint = JSON.parse(JSON.stringify(template));
                            // Fill the values of the parameter constraint
                            for (const [paramKey, param] of Object.entries((valueConstraint as any).value as NodeProperties)) {
                                param.value = (repeatValue as any).formValues[paramKey] || "";
                            }
                            (property.value as any)[(repeatValue as any).key] = valueConstraint;
                        }
                    } else {
                        property.value = dataValue;
                    }
                    const imports = getImportsForProperty(key, formImports);
                    property.imports = imports;
                }
            }
        }
        console.log("Updated function node: ", functionNodeCopy);
        const sourceCode = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath, flowNode: functionNodeCopy, isFunctionNodeUpdate: true });

        if (sourceCode.artifacts.length === 0) {
            setSaving(false);
            showErrorNotification();
        } else {
            const newArtifact = sourceCode.artifacts.find(res => res.isNew);
            if (newArtifact) {
                if (isPopup) {
                    handleClosePopup(functionNodeCopy.properties.functionName.value as string);
                    return;
                }
                rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: newArtifact.path, position: newArtifact.position } });
                return;
            }
            const updatedArtifact = sourceCode.artifacts.find(res => !res.isNew && (res.name === functionName || res.context === functionName || res.name === data?.functionName));
            if (updatedArtifact) {
                rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: updatedArtifact.path, position: updatedArtifact.position } });
                return;
            }
        }
    };

    const handleFormSubmit = async (data: FormValues, formImports?: FormImports) => {
        setSaving(true);
        // HACK: Remove new lines from function description fields
        const descriptionFields = ["functionNameDescription", "typeDescription"];
        for (const field of descriptionFields) {
            if (data[field]) {
                data[field] = data[field]?.replace(/\n/g, " ");
            }
        }
        // HACK: Remove new lines from parameter description
        if (data.parameters) {
            for (const parameter of data.parameters) {
                if (parameter && parameter.formValues?.parameterDescription) {
                    parameter.formValues.parameterDescription = parameter.formValues.parameterDescription.replace(/\n/g, " ");
                }
            }
        }

        try {
            await onSubmit(data, formImports);
        } catch (error) {
            console.error("Error submitting form: ", error);
            showErrorNotification();
        }
    };

    const showErrorNotification = async () => {
        const functionType = getFunctionType();
        await rpcClient
            .getCommonRpcClient()
            .showErrorMessage({
                message: `${functionName ? `Failed to update the ${functionType}` : `Failed to create the ${functionType}`}. `
            });
    }

    const getFunctionType = () => {
        if (isDataMapper) {
            return "Data Mapper";
        } else if (isNpFunction) {
            return "Natural Function";
        } else if (isAutomation || functionName === "main") {
            return "Automation";
        }
        return "Function";
    };

    const handleClosePopup = (functionName?: string) => {
        rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.CLOSE_VIEW, location: { view: null, recentIdentifier: functionName, artifactType: DIRECTORY_MAP.FUNCTION }, isPopup: true });
    }

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

    //HACK: Hide is isolated field form function form
    functionFields.forEach((field) => {
        if (field.key === "isIsolated") {
            field.hidden = true;
        }
    });

    return (
        <View>
            {!isPopup &&
                <>
                    <TopNavigationBar projectPath={projectPath} />
                    <TitleBar
                        title={formType.current}
                        subtitle={titleSubtitle}
                    />
                </>
            }
            <ViewContent padding>
                <Container>
                    {isPopup && (
                        <>
                            <TopBar>
                                <Typography variant="h2">Create New Function</Typography>
                                <Button appearance="icon" onClick={() => handleClosePopup()}>
                                    <Codicon name="close" />
                                </Button>
                            </TopBar>
                            <BodyText>
                                Create a new function to define reusable logic.
                            </BodyText>
                        </>
                    )}
                    <FormHeader
                        title={`${functionName ? 'Edit' : 'Create New'} ${formType.current}`}
                        subtitle={formSubtitle}
                    />
                    {isLoading && (
                        <LoadingContainer>
                            <LoadingRing />
                        </LoadingContainer>
                    )}
                    <FormContainer>
                        {filePath && targetLineRange && functionFields.length > 0 &&
                            <FormGeneratorNew
                                fileName={filePath}
                                nestedForm={true}
                                targetLineRange={targetLineRange}
                                fields={functionFields}
                                isSaving={saving}
                                onSubmit={handleFormSubmit}
                                submitText={saving ? (functionName ? "Saving..." : "Creating...") : (functionName ? "Save" : "Create")}
                                selectedNode={functionNode?.codedata?.node}
                                preserveFieldOrder={true}
                            />
                        }
                    </FormContainer>
                </Container>
            </ViewContent>
        </View>
    );
}
