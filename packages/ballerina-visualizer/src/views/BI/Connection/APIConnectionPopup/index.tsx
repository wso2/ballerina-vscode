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

import React, { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, Dropdown, Overlay, Stepper, TextField, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { AvailableNode, Category, DataMapperDisplayMode, DIRECTORY_MAP, FlowNode, LinePosition, ParentPopupData } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ExpressionFormField } from "@wso2/ballerina-side-panel";
import ConnectionConfigView from "../ConnectionConfigView";
import { getFormProperties } from "../../../../utils/bi";
import { FormSubmitOptions } from "../../FlowDiagram";

const PopupOverlay = styled(Overlay)`
    z-index: 1999;
`;

const PopupContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 860px;
    height: 82%;
    max-height: 840px;
    z-index: 2000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const BackButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const HeaderTitleContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PopupTitle = styled(Typography)`
    font-size: 20px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const PopupSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const CloseButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const StepperContainer = styled.div`
    padding: 20px 32px 18px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const ContentContainer = styled.div<{ hasFooterButton?: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "hidden" : "auto"};
    padding: 24px 32px;
    padding-bottom: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "0" : "24px"};
    min-height: 0;
`;

const FooterContainer = styled.div`
    position: sticky;
    bottom: 0;
    padding: 20px 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
`;

const StepContent = styled.div<{ fillHeight?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 20px;
    ${(props: { fillHeight?: boolean }) => props.fillHeight && `
        flex: 1;
        min-height: 0;
        height: 100%;
    `}
`;

const SectionTitle = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const SectionSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 30px;
    background: transparent;
    border: none;
    padding: 0;
`;

const FormField = styled.div`
    display: flex;
    flex-direction: column;
`;

const UploadCard = styled.div<{ hasFile?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 14px;
    background: ${ThemeColors.SURFACE_DIM};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${ThemeColors.PRIMARY};
        background: ${ThemeColors.SURFACE_CONTAINER};
    }

    ${(props: { hasFile?: boolean }) =>
        props.hasFile
            ? `
        border-color: ${ThemeColors.PRIMARY};
        background: ${ThemeColors.PRIMARY_CONTAINER};
    `
            : ""}
`;

const UploadIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: ${ThemeColors.SURFACE_BRIGHT};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${ThemeColors.ON_SURFACE};
`;

const UploadText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const UploadTitle = styled(Typography)`
    font-size: 14px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const UploadSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;


const ActionButton = styled(Button)`
    width: 100% !important;
    min-width: 0 !important;
    display: flex !important;
    justify-content: center;
    align-items: center;
`;

const SummaryCard = styled.div`
    padding: 12px 14px;
    border-radius: 10px;
    background: ${ThemeColors.SURFACE_CONTAINER};
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    color: ${ThemeColors.ON_SURFACE};
    font-size: 12px;
`;

const InfoRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const StepHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DisabledActionButton = styled(Button)`
    width: 100% !important;
    min-width: 0 !important;
    margin-top: 4px;
`;

const FormGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const StepBadge = styled.div<{ active?: boolean; completed?: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props: { active?: boolean; completed?: boolean }) =>
        props.completed
            ? ThemeColors.PRIMARY_CONTAINER
            : props.active
                ? ThemeColors.SURFACE_DIM
                : ThemeColors.SURFACE_CONTAINER};
    border: 1px solid
        ${(props: { active?: boolean; completed?: boolean }) =>
        props.completed
            ? ThemeColors.PRIMARY
            : props.active
                ? ThemeColors.OUTLINE
                : ThemeColors.OUTLINE_VARIANT};
    color: ${(props: { active?: boolean; completed?: boolean }) =>
        props.completed ? ThemeColors.PRIMARY : ThemeColors.ON_SURFACE_VARIANT};
    font-weight: 600;
`;

const StepperLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StepperRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const StepperCopy = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

interface APIConnectionPopupProps {
    projectPath: string;
    fileName: string;
    target?: LinePosition;
    onClose?: (parent?: ParentPopupData) => void;
    onBack?: () => void;
}

export function APIConnectionPopup(props: APIConnectionPopupProps) {
    const { projectPath, fileName, target, onBack, onClose } = props;
    const { rpcClient } = useRpcContext();

    const [currentStep, setCurrentStep] = useState(0);
    const [specType, setSpecType] = useState<string>("OpenAPI");
    const [selectedFilePath, setSelectedFilePath] = useState<string>("");
    const [connectorName, setConnectorName] = useState<string>("");

    const [isSavingConnector, setIsSavingConnector] = useState<boolean>(false);
    const [isSavingConnection, setIsSavingConnection] = useState<boolean>(false);
    const [selectedFlowNode, setSelectedFlowNode] = useState<FlowNode | undefined>(undefined);
    const [updatedExpressionField, setUpdatedExpressionField] = useState<ExpressionFormField>(undefined);

    const steps = useMemo(() => ["Import API Specification", "Create Connection"], []);

    const apiSpecOptions = useMemo(
        () => [
            { id: "openapi", value: "OpenAPI", content: "OpenAPI" },
            { id: "wsdl", value: "WSDL", content: "WSDL" },
        ],
        []
    );

    const supportedFileFormats = useMemo(() => {
        const isOpenApi = specType.toLowerCase() === "openapi";
        return isOpenApi ? ".yaml, .yml, .json" : ".wsdl";
    }, [specType]);

    const handleFileSelect = async () => {
        if (!rpcClient) {
            return;
        }
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({ isFile: true });
        if (projectDirectory.path) {
            setSelectedFilePath(projectDirectory.path);
        }
    };

    const getFileName = (filePath: string) => {
        if (!filePath) return "";
        const parts = filePath.split(/[/\\]/);
        return parts[parts.length - 1];
    };

    const handleOnGenerateSubmit = async (specFilePath: string, module: string, specType: string) => {
        if (!rpcClient) {
            return { success: false, errorMessage: "RPC client not available" };
        }

        const isOpenApi = specType.toLowerCase() === "openapi";

        if (isOpenApi) {
            const response = await rpcClient.getBIDiagramRpcClient().generateOpenApiClient({
                openApiContractPath: specFilePath,
                projectPath: projectPath,
                module: module,
            });
            return {
                success: !response.errorMessage,
                errorMessage: response.errorMessage,
            };
        } else {
            // WSDL generation
            const response = await rpcClient.getConnectorWizardRpcClient().generateWSDLApiClient({
                wsdlFilePath: specFilePath,
                projectPath: projectPath,
                module: module,
            });
            return {
                success: !response.errorMsg,
                errorMessage: response.errorMsg,
            };
        }
    };

    const findConnectorByModule = (categories: Category[], moduleName: string): AvailableNode | null => {
        for (const category of categories) {
            if (category.items) {
                for (const item of category.items) {
                    if ("codedata" in item) {
                        const availableNode = item as AvailableNode;
                        if (availableNode.codedata?.module === moduleName) {
                            return availableNode;
                        }
                    }
                }
            }
        }
        return null;
    };

    const handleSaveConnector = async () => {
        if (!selectedFilePath || !connectorName || !rpcClient) {
            return;
        }
        setIsSavingConnector(true);
        const generateResponse = await handleOnGenerateSubmit(selectedFilePath, connectorName, specType);

        // Only proceed if there's no error message
        if (generateResponse?.success) {
            // Wait a bit for the connector to be available, then search for it
            try {
                // Small delay to ensure the connector is available
                await new Promise(resolve => setTimeout(resolve, 500));

                const defaultPosition = target || { line: 0, offset: 0 };
                const searchResponse = await rpcClient.getBIDiagramRpcClient().search({
                    position: {
                        startLine: defaultPosition,
                        endLine: defaultPosition,
                    },
                    filePath: fileName,
                    queryMap: {
                        limit: 60,
                        filterByCurrentOrg: false,
                    },
                    searchKind: "CONNECTOR",
                });

                // Find the connector we just created
                const createdConnector = findConnectorByModule(searchResponse.categories, connectorName);
                if (createdConnector && createdConnector.codedata) {
                    // Get the flowNode template
                    const nodeTemplateResponse = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                        position: target || null,
                        filePath: fileName,
                        id: createdConnector.codedata,
                    });
                    setSelectedFlowNode(nodeTemplateResponse.flowNode);
                } else {
                    console.warn(">>> Created connector not found in search results");
                }
            } catch (error) {
                console.error(">>> Error finding created connector", error);
            }
            setCurrentStep(1);
        } else {
            console.error(">>> Error generating connector:", generateResponse?.errorMessage);
            // Optionally show error to user
        }
        setIsSavingConnector(false);
    };

    const handleOnFormSubmit = async (node: FlowNode, _dataMapperMode?: DataMapperDisplayMode, options?: FormSubmitOptions) => {
        console.log(">>> on form submit", node);
        if (selectedFlowNode) {
            setIsSavingConnection(true);
            const visualizerLocation = await rpcClient.getVisualizerLocation();
            let connectionsFilePath = visualizerLocation.documentUri || visualizerLocation.projectPath;

            if (node.codedata.isGenerated && !connectionsFilePath.endsWith(".bal")) {
                connectionsFilePath += "/main.bal";
            }

            if (connectionsFilePath === "") {
                console.error(">>> Error updating source code. No source file found");
                setIsSavingConnection(false);
                return;
            }

            // node property scope is local. then use local file path and line position
            if ((node.properties?.scope?.value as string)?.toLowerCase() === "local") {
                node.codedata.lineRange = {
                    fileName: visualizerLocation.documentUri,
                    startLine: target,
                    endLine: target,
                };
            }

            // Check if the node is a connector
            const isConnector = node.codedata.node === "NEW_CONNECTION";

            rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({
                    filePath: connectionsFilePath,
                    flowNode: node,
                    isConnector: isConnector,
                })
                .then((response) => {
                    console.log(">>> Updated source code", response);
                    if (response.artifacts.length > 0) {
                        setIsSavingConnection(false);
                        const newConnection = response.artifacts.find((artifact) => artifact.isNew);
                        onClose?.({ recentIdentifier: newConnection.name, artifactType: DIRECTORY_MAP.CONNECTION });
                    } else {
                        console.error(">>> Error updating source code", response);
                        setIsSavingConnection(false);
                    }
                })
                .catch((error) => {
                    console.error(">>> Error saving connection", error);
                }).finally(() => {
                    setIsSavingConnection(false);
                });
        }
    };

    const renderStepper = () => {
        return (
            <>
                <StepperContainer>
                    <Stepper steps={steps} currentStep={currentStep} alignment="center" />
                </StepperContainer>
            </>
        );
    };

    const renderImportStep = () => (
        <StepContent>
            <StepHeader>
                <Typography variant="h3" sx={{ color: ThemeColors.ON_SURFACE, marginBottom: "5px" }}>
                    Connector Configuration
                </Typography>
                <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                    Import API specification for the connector
                </Typography>
            </StepHeader>
            <FormSection>
                <FormField>
                    <Dropdown
                        id="api-spec-type"
                        label="Specification Type"
                        items={apiSpecOptions}
                        value={specType}
                        onValueChange={(value) => setSpecType(value)}
                    />
                </FormField>
                <FormField>
                    <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE, marginBottom: "0px", fontSize: "13px", fontWeight: 500 }}>
                        Connector Name
                    </Typography>
                    <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT, marginBottom: "8px", fontSize: "12px" }}>
                        Name of the connector module to be generated
                    </Typography>
                    <TextField
                        id="connector-name"
                        value={connectorName}
                        onTextChange={(value) => setConnectorName(value)}
                        placeholder="Enter connector name"
                    />
                </FormField>
                <FormField>
                    <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE, marginBottom: "8px", fontSize: "13px", fontWeight: 500 }}>
                        Import Specification File
                    </Typography>
                    <UploadCard
                        hasFile={!!selectedFilePath}
                        onClick={handleFileSelect}
                        data-testid="api-spec-upload"
                    >
                        <UploadIcon>
                            <Codicon name="files" />
                        </UploadIcon>
                        <UploadText>
                            <UploadTitle variant="body2">
                                {selectedFilePath ? selectedFilePath : "Choose file to import"}
                            </UploadTitle>
                            <UploadSubtitle variant="body2">Supports {supportedFileFormats} files</UploadSubtitle>
                        </UploadText>
                    </UploadCard>
                </FormField>
            </FormSection>
        </StepContent>
    );

    const renderConnectionStep = () => {
        if (selectedFlowNode) {
            return (
                <StepContent fillHeight={true}>
                    <div>
                        <SectionTitle variant="h3">Connection Details</SectionTitle>
                        <SectionSubtitle variant="body2">
                            Configure connection settings
                        </SectionSubtitle>
                    </div>
                    <ConnectionConfigView
                        fileName={fileName}
                        submitText={isSavingConnection ? "Creating..." : "Save Connection"}
                        isSaving={isSavingConnection}
                        selectedNode={selectedFlowNode}
                        onSubmit={handleOnFormSubmit}
                        updatedExpressionField={updatedExpressionField}
                        resetUpdatedExpressionField={() => setUpdatedExpressionField(undefined)}
                        isPullingConnector={isSavingConnection}
                        footerActionButton={true}
                    />
                </StepContent>
            );
        }
        return (
            <StepContent>
                <FormSection>
                    <Typography variant="body2" sx={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                        Loading connector configuration...
                    </Typography>
                </FormSection>
            </StepContent>
        );
    };

    const renderStepContent = () => {
        if (currentStep === 0) {
            return renderImportStep();
        }
        return renderConnectionStep();
    };

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer>
                <PopupHeader>
                    <BackButton appearance="icon" onClick={onBack}>
                        <Codicon name="chevron-left" />
                    </BackButton>
                    <HeaderTitleContainer>
                        <PopupTitle variant="h2">Connect via API Specification</PopupTitle>
                        <PopupSubtitle variant="body2">Import an API specification file to create a connection</PopupSubtitle>
                    </HeaderTitleContainer>
                    <CloseButton appearance="icon" onClick={() => onClose?.()}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                {renderStepper()}
                <ContentContainer hasFooterButton={currentStep === 1}>{renderStepContent()}</ContentContainer>
                {currentStep === 0 && (
                    <FooterContainer>
                        <ActionButton
                            appearance="primary"
                            disabled={!selectedFilePath || !connectorName || isSavingConnector}
                            onClick={handleSaveConnector}
                            buttonSx={{ width: "100%", height: "35px" }}
                        >
                            {isSavingConnector ? "Saving..." : "Save Connector"}
                        </ActionButton>
                    </FooterContainer>
                )}
            </PopupContainer>
        </>
    );
}

export default APIConnectionPopup;

