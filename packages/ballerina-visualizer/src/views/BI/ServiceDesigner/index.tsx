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

import { useEffect, useState, useRef } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { NodePosition } from "@wso2/syntax-tree";
import {
    EVENT_TYPE,
    LineRange,
    MACHINE_VIEW,
    ServiceModel,
    FunctionModel,
    STModification,
    removeStatement,
    DIRECTORY_MAP,
    ProjectStructureArtifactResponse,
    PropertyModel,
} from "@wso2/ballerina-core";
import { Button, Codicon, Icon, LinkButton, Typography, View } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { ResourceAccordion } from "./components/ResourceAccordion";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { FunctionConfigForm } from "./Forms/FunctionConfigForm";
import { ResourceForm } from "./Forms/ResourceForm";
import { FunctionForm } from "./Forms/FunctionForm";
import { applyModifications, isPositionChanged } from "../../../utils/utils";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { TitleBar } from "../../../components/TitleBar";
import { LoadingRing } from "../../../components/Loader";

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

const InfoContainer = styled.div`
    display: flex;
    gap: 20px;
    padding: 15px;
    //border: 1px solid var(--vscode-editorIndentGuide-background);
`;

const InfoSection = styled.div`
    display: flex;
    align-items: center;
`;

const ServiceContainer = styled.div`
    padding-right: 10px;
    padding-left: 10px;
`;

const FunctionsContainer = styled.div`
    max-height: 550px;
    overflow: scroll;
`;

const ButtonText = styled.span`
    @media (max-width: 768px) {
        display: none;
    }
    width: 100%;
`;

interface ServiceDesignerProps {
    filePath: string;
    position: NodePosition;
    serviceIdentifier: string;
}

export function ServiceDesigner(props: ServiceDesignerProps) {
    const { filePath, position, serviceIdentifier } = props;
    const { rpcClient } = useRpcContext();
    const [serviceModel, setServiceModel] = useState<ServiceModel>(undefined);
    const [functionModel, setFunctionModel] = useState<FunctionModel>(undefined);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const [isNew, setIsNew] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [showFunctionConfigForm, setShowFunctionConfigForm] = useState<boolean>(false);
    const [projectListeners, setProjectListeners] = useState<ProjectStructureArtifactResponse[]>([]);
    const prevPosition = useRef(position);

    useEffect(() => {
        if (!serviceModel || isPositionChanged(prevPosition.current, position)) {
            fetchService(position);
        }
    }, [position]);

    const fetchService = (targetPosition: NodePosition) => {
        const lineRange: LineRange = {
            startLine: { line: targetPosition.startLine, offset: targetPosition.startColumn },
            endLine: { line: targetPosition.endLine, offset: targetPosition.endColumn },
        };
        try {
            rpcClient
                .getServiceDesignerRpcClient()
                .getServiceModelFromCode({ filePath, codedata: { lineRange } })
                .then((res) => {
                    console.log("Service Model: ", res.service);
                    setShowForm(false);
                    setServiceModel(res.service);
                    setIsSaving(false);
                    prevPosition.current = targetPosition;
                });
        } catch (error) {
            console.log("Error fetching service model: ", error);
        }
        getProjectListeners();
    };

    const getProjectListeners = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                const listeners = res.directoryMap[DIRECTORY_MAP.LISTENER];
                if (listeners.length > 0) {
                    setProjectListeners(listeners);
                }
            });
    };

    const handleOpenListener = (value: string) => {
        const listenerValue = projectListeners.find((listener) => listener.name === value);
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIListenerConfigView,
                position: listenerValue.position,
                documentUri: listenerValue.path,
            },
        });
    };

    const handleOpenDiagram = async (resource: FunctionModel) => {
        const lineRange: LineRange = resource.codedata.lineRange;
        const nodePosition: NodePosition = {
            startLine: lineRange.startLine.line,
            startColumn: lineRange.startLine.offset,
            endLine: lineRange.endLine.line,
            endColumn: lineRange.endLine.offset,
        };
        await rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { position: nodePosition, documentUri: filePath } });
    };

    const handleServiceEdit = async () => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceConfigView,
                position: position,
                documentUri: filePath,
            },
        });
    };

    const handleNewResourceFunction = () => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getHttpResourceModel({ type: "http", functionName: "resource" })
            .then((res) => {
                console.log("New Function Model: ", res.function);
                setFunctionModel(res.function);
                setIsNew(true);
                setShowForm(true);
            });
    };

    const handleNewFunction = () => {
        setIsNew(true);
        setShowFunctionConfigForm(true);
    };

    const handleNewFunctionClose = () => {
        setIsNew(false);
        setShowForm(false);
    };

    const handleFunctionEdit = (value: FunctionModel) => {
        setFunctionModel(value);
        setIsNew(false);
        setShowForm(true);
    };

    const handleFunctionDelete = async (model: FunctionModel) => {
        if (model.kind === "REMOTE") {
            model.enabled = false;
            await handleResourceSubmit(model);
        } else {
            console.log("Deleting Resource Model:", model);
            const targetPosition: NodePosition = {
                startLine: model.codedata.lineRange.startLine.line,
                startColumn: model.codedata.lineRange.startLine.offset,
                endLine: model.codedata.lineRange.endLine.line,
                endColumn: model.codedata.lineRange.endLine.offset,
            };
            const deleteAction: STModification = removeStatement(targetPosition);
            await applyModifications(rpcClient, [deleteAction]);
            fetchService(targetPosition);
        }
    };

    const handleResourceSubmit = async (value: FunctionModel) => {
        setIsSaving(true);
        const lineRange: LineRange = {
            startLine: { line: position.startLine, offset: position.startColumn },
            endLine: { line: position.endLine, offset: position.endColumn },
        };
        let res = undefined;
        if (isNew) {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .addResourceSourceCode({ filePath, codedata: { lineRange }, function: value, service: serviceModel });
            const serviceArtifact = res.artifacts.find(res => res.isNew && res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
                setIsSaving(false);
                return;
            }
        } else {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .updateResourceSourceCode({ filePath, codedata: { lineRange }, function: value, service: serviceModel });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
                setIsSaving(false);
                return;
            }
        }
        setIsNew(false);
    };

    const handleFunctionSubmit = async (value: FunctionModel) => {
        setIsSaving(true);
        const lineRange: LineRange = {
            startLine: { line: position.startLine, offset: position.startColumn },
            endLine: { line: position.endLine, offset: position.endColumn },
        };
        let res = undefined;
        if (isNew) {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .addFunctionSourceCode({ filePath, codedata: { lineRange }, function: value });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            }
        } else {
            res = await rpcClient
                .getServiceDesignerRpcClient()
                .updateResourceSourceCode({ filePath, codedata: { lineRange }, function: value });
            const serviceArtifact = res.artifacts.find(res => res.name === serviceIdentifier);
            if (serviceArtifact) {
                fetchService(serviceArtifact.position);
                await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });
            }
        }
        setIsNew(false);
        handleNewFunctionClose();
        handleFunctionConfigClose();
        setIsSaving(false);
    };

    const handleFunctionConfigClose = () => {
        setShowFunctionConfigForm(false);
    };

    const handleServiceTryIt = () => {
        const basePath = serviceModel.properties?.basePath?.value?.trim();
        const listener = serviceModel.properties?.listener?.value?.trim();
        const commands = ["ballerina.tryit", false, undefined, { basePath, listener }];
        rpcClient.getCommonRpcClient().executeCommand({ commands });
    }

    const handleExportOAS = () => {
        rpcClient.getServiceDesignerRpcClient().exportOASFile({});
    };

    const findIcon = (label: string) => {
        label = label.toLowerCase();
        switch (true) {
            case label.includes("listener"):
                return "bell";
            case label.includes("path"):
                return "link";
            default:
                return "info";
        }
    };

    const getAttributeComponent = (component: PropertyModel) => {
        const label = component.metadata.label.toLowerCase();
        switch (true) {
            case label.includes("listener"):
                return component.values?.length > 0 ? (
                    component.values.map((item, index) => (
                        <LinkButton
                            sx={{ fontSize: 12, padding: 8, gap: 4 }}
                            key={`${index}-btn`}
                            onClick={() => handleOpenListener(item)}
                        >
                            {item}
                        </LinkButton>
                    ))
                ) : (
                    <LinkButton
                        sx={{ fontSize: 12, padding: 8, gap: 4 }}
                        onClick={() => handleOpenListener(component.value)}
                    >
                        {component.value}
                    </LinkButton>
                );
            case label.includes("path"):
                return component.value;
            default:
                return component.value;
        }
    };

    const haveServiceTypeName = serviceModel?.properties["serviceTypeName"]?.value;

    return (
        <View>
            <TopNavigationBar />
            <TitleBar
                title="Service Designer"
                subtitle="Implement and configure your service"
                actions={
                    <>
                        <Button appearance="secondary" tooltip="Edit Service" onClick={handleServiceEdit}>
                            <Icon name="bi-edit" sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Edit</ButtonText>
                        </Button>
                        {serviceModel && serviceModel.moduleName === "http" && (
                            <Button appearance="secondary" tooltip="Try Service" onClick={handleServiceTryIt}>
                                <Icon name="play" isCodicon={true} sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Try It</ButtonText>
                            </Button>
                        )}
                        {serviceModel && serviceModel.moduleName === "http" && (
                            <Button appearance="secondary" tooltip="Export OpenAPI Spec" onClick={handleExportOAS}>
                                <Icon name="bi-export" sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Export</ButtonText>
                            </Button>
                        )}
                        {serviceModel &&
                            serviceModel.moduleName !== "http" &&
                            serviceModel.functions.some((func) => !func.enabled) && (
                                <Button appearance="primary" tooltip="Add Function" onClick={handleNewFunction}>
                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Function</ButtonText>
                                </Button>
                            )}
                        {serviceModel && serviceModel.moduleName === "http" && !haveServiceTypeName && (
                            <Button appearance="primary" tooltip="Add Resource" onClick={handleNewResourceFunction}>
                                <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Resource</ButtonText>
                            </Button>
                        )}
                    </>
                }
            />
            <ServiceContainer>
                {!serviceModel && (
                    <LoadingContainer>
                        <LoadingRing message="Loading Service..." />
                    </LoadingContainer>
                )}
                {serviceModel && (
                    <>
                        <InfoContainer>
                            {Object.keys(serviceModel.properties).map(
                                (key, index) =>
                                    serviceModel.properties[key].value &&
                                    serviceModel.properties[key].codedata.type !== "ANNOTATION_ATTACHMENT" && (
                                        <InfoSection>
                                            <Icon
                                                name={findIcon(serviceModel.properties[key].metadata.label)}
                                                isCodicon
                                                sx={{ marginRight: "8px" }}
                                            />
                                            <Typography key={`${index}-label`} variant="body3">
                                                {serviceModel.properties[key].metadata.label}:
                                            </Typography>
                                            <Typography key={`${index}-value`} variant="body3">
                                                {getAttributeComponent(serviceModel.properties[key])}
                                            </Typography>
                                        </InfoSection>
                                    )
                            )}

                            {serviceModel.moduleName === "http" &&
                                serviceModel.functions
                                    .filter((func) => func.kind === "DEFAULT" && func.enabled)
                                    .map((functionModel, index) => (
                                        <InfoSection>
                                            <Icon name={findIcon("init")} isCodicon sx={{ marginRight: "8px" }} />
                                            <Typography key={`${index}-label`} variant="body3">
                                                Constructor:
                                            </Typography>
                                            <Typography key={`${index}-value`} variant="body3">
                                                <LinkButton
                                                    sx={{ fontSize: 12, padding: 8, gap: 4 }}
                                                    onClick={() => handleOpenDiagram(functionModel)}
                                                >
                                                    {functionModel.name.value}
                                                </LinkButton>
                                            </Typography>
                                        </InfoSection>
                                    ))}
                        </InfoContainer>

                        <Typography
                            key={"title"}
                            variant="body2"
                            sx={{ marginLeft: 10, marginBottom: 20, marginTop: 10 }}
                        >
                            Available {serviceModel.moduleName === "http" ? "Resources" : "Functions"}
                        </Typography>
                        <FunctionsContainer>
                            {serviceModel.functions
                                .filter(
                                    (functionModel) =>
                                        (serviceModel.moduleName === "http"
                                            ? functionModel.kind === "RESOURCE"
                                            : true) && functionModel.enabled
                                )
                                .map((functionModel, index) => (
                                    <ResourceAccordion
                                        key={`${index}-${functionModel.name.value}`}
                                        functionModel={functionModel}
                                        goToSource={() => { }}
                                        onEditResource={handleFunctionEdit}
                                        onDeleteResource={handleFunctionDelete}
                                        onResourceImplement={handleOpenDiagram}
                                    />
                                ))}
                        </FunctionsContainer>
                    </>
                )}
                {functionModel && functionModel.kind === "RESOURCE" && (
                    <PanelContainer
                        title={"Resource Configuration"}
                        show={showForm}
                        onClose={handleNewFunctionClose}
                        width={600}
                    >
                        <ResourceForm
                            model={functionModel}
                            isSaving={isSaving}
                            onSave={handleResourceSubmit}
                            onClose={handleNewFunctionClose}
                        />
                    </PanelContainer>
                )}
                {functionModel && functionModel.kind === "REMOTE" && (
                    <PanelContainer
                        title={"Function Configuration"}
                        show={showForm}
                        onClose={handleNewFunctionClose}
                        width={600}
                    >
                        <FunctionForm
                            model={functionModel}
                            onSave={handleFunctionSubmit}
                            onClose={handleNewFunctionClose}
                        />
                    </PanelContainer>
                )}

                {serviceModel?.moduleName !== "http" && (
                    <PanelContainer
                        title={"Function Configuration"}
                        show={showFunctionConfigForm}
                        onClose={handleFunctionConfigClose}
                    >
                        <FunctionConfigForm
                            isSaving={isSaving}
                            serviceModel={serviceModel}
                            onSubmit={handleFunctionSubmit}
                            onBack={handleFunctionConfigClose}
                        />
                    </PanelContainer>
                )}
            </ServiceContainer>
        </View>
    );
}
