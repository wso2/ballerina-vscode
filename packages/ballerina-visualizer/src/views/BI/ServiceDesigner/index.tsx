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

import styled from "@emotion/styled";
import {
    DIRECTORY_MAP,
    EVENT_TYPE,
    FunctionModel,
    LineRange,
    MACHINE_VIEW,
    ProjectStructureArtifactResponse,
    STModification,
    ServiceModel,
    removeStatement,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { NodePosition } from "@wso2/syntax-tree";
import { Button, Codicon, Icon, TextField, Typography, View } from "@wso2/ui-toolkit";
import { useEffect, useRef, useState } from "react";
import { LoadingRing } from "../../../components/Loader";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { applyModifications, isPositionChanged } from "../../../utils/utils";
import { AddServiceElementDropdown, DropdownOptionProps } from "./components/AddServiceElementDropdown";
import { ResourceAccordion } from "./components/ResourceAccordion";
import { ResourceAccordionV2 } from "./components/ResourceAccordionV2";
import { FunctionConfigForm } from "./Forms/FunctionConfigForm";
import { FunctionForm } from "./Forms/FunctionForm";
import { ResourceForm } from "./Forms/ResourceForm";
import { getCustomEntryNodeIcon } from "../ComponentListView/EventIntegrationPanel";

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    flex-direction: column;
`;

const ServiceContainer = styled.div`
    padding-right: 10px;
    padding-left: 10px;
    flex-grow: 1;
    overflow-y: auto;
    height: 0; /* This forces the flex item to use available space */
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

const HeaderContainer = styled.div`
    display: flex;
    padding: 15px;
    align-items: center;
    justify-content: space-between;
`;

const ServiceMetadataContainer = styled.div`
    padding: 15px;
    border-bottom: 1px solid var(--vscode-editorIndentGuide-background);
    display: flex;
    gap: 20px;
`;

const ListenerSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 3;
`;

const ListenerHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ListenerContent = styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
    margin-top: 10px;
`;

const ListenerItem = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background-color: var(--vscode-editor-background);
    transition: all 0.2s ease;
    
    &:hover .listener-icon {
        border-color: var(--vscode-focusBorder);
    }
    
    &:hover .listener-text {
        color: var(--vscode-focusBorder);
    }
`;

const ListenerIcon = styled.div`
    width: 48px;
    height: 48px;
    background-color: var(--vscode-editor-background);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--vscode-editorIndentGuide-background);
    transition: border-color 0.2s ease;
`;

const PropertiesSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 2;
    padding-left: 20px;
    border-left: 1px solid var(--vscode-editorIndentGuide-background);
`;

const PropertyItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 16px;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
`;

const PropertyLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
`;

const PropertyValue = styled.div`
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background-color: var(--vscode-editor-background);
    border-radius: 4px;
    border: 1px solid var(--vscode-editorIndentGuide-background);
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
`;

interface ServiceDesignerProps {
    filePath: string;
    position: NodePosition;
    serviceIdentifier: string;
}

interface ReadonlyProperty {
    label: string;
    value: string | string[];
}

export const ADD_HANDLER = "add-handler";
export const ADD_INIT_FUNCTION = "add-init-function";
export const ADD_REUSABLE_FUNCTION = "add-reusable-function";

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

    const [resources, setResources] = useState<ProjectStructureArtifactResponse[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [listeners, setListeners] = useState<string[]>([]);
    const [readonlyProperties, setReadonlyProperties] = useState<Set<ReadonlyProperty>>(new Set());
    const [isHttpService, setIsHttpService] = useState<boolean>(false);
    const [objectMethods, setObjectMethods] = useState<FunctionModel[]>([]);
    const [dropdownOptions, setDropdownOptions] = useState<DropdownOptionProps[]>([]);
    const [initMethod, setInitMethod] = useState<FunctionModel>(undefined);
    const [enabledHandlers, setEnabledHandlers] = useState<FunctionModel[]>([]);
    const [unusedHandlers, setUnusedHandlers] = useState<FunctionModel[]>([]);

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
                    setServiceMetaInfo(res.service);
                    setIsSaving(false);
                    prevPosition.current = targetPosition;
                });
        } catch (error) {
            console.log("Error fetching service model: ", error);
        }
        getProjectListeners();
    };

    const setServiceMetaInfo = (service: ServiceModel) => {
        if (service?.properties?.listener) {
            const listenerProperty = service.properties.listener;
            if (listenerProperty.values && listenerProperty.values.length > 0) {
                setListeners(listenerProperty.values);
            } else if (listenerProperty.value) {
                setListeners([listenerProperty.value]);
            }
        }
        if (service?.properties) {
            // iterate over each property and check if it's readonly
            const readonlyProps: Set<ReadonlyProperty> = new Set();
            Object.keys(service.properties).forEach((key) => {
                if (key === "listener" || service.properties[key].codedata.type === "ANNOTATION_ATTACHMENT") {
                    return;
                }
                const property = service.properties[key];
                if (property.enabled === true) {
                    readonlyProps.add({ label: property.metadata.label, value: property.value || property.values });
                }
            });
            setReadonlyProperties(readonlyProps);
            setIsHttpService(service.moduleName === "http");
        }

        // Extract object methods if available (for service classes)
        const objectMethods: FunctionModel[] = [];
        const enabledHandlers: FunctionModel[] = [];
        const unusedHandlers: FunctionModel[] = [];

        let hasInitMethod = false;
        service.functions.forEach(func => {
            if (func.kind === "DEFAULT") {
                if (func.name?.value === "init") {
                    hasInitMethod = true;
                    setInitMethod(func);
                } else {
                    objectMethods.push(func);
                }
            }
            if (func.kind === "REMOTE" || func.kind === "RESOURCE") {
                if (func.enabled) {
                    enabledHandlers.push(func);
                } else {
                    unusedHandlers.push(func);
                }
            }
        });

        setEnabledHandlers(enabledHandlers);
        setUnusedHandlers(unusedHandlers);
        setObjectMethods(objectMethods);

        // Set dropdown options
        const options: DropdownOptionProps[] = [];

        if (unusedHandlers.length > 0) {
            options.push({
                title: "Add Handler",
                description: "Select the handler to add",
                value: ADD_HANDLER
            });
        }
        if (!hasInitMethod) {
            options.push({
                title: "Add Init Function",
                description: "Add a new init function within the service",
                value: ADD_INIT_FUNCTION
            });
        }

        options.push({
            title: "Add Function",
            description: "Add a new reusable function within the service",
            value: ADD_REUSABLE_FUNCTION
        });
        setDropdownOptions(options);
    }

    const getProjectListeners = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                const listeners = res.directoryMap[DIRECTORY_MAP.LISTENER];
                if (listeners.length > 0) {
                    setProjectListeners(listeners);
                }
                const services = res.directoryMap[DIRECTORY_MAP.SERVICE];
                if (services.length > 0) {
                    const selectedService = services.find((service) => service.name === serviceIdentifier);
                    setResources(selectedService.resources);
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

    const handleNewObjectMethod = () => {
        rpcClient
            .getServiceDesignerRpcClient()
            .getFunctionModel({ type: "object", functionName: "default" })
            .then((res) => {
                console.log("New Function Model: ", res.function);
                setFunctionModel(res.function);
                setIsNew(true);
                setShowForm(true);
            });
    };

    const onSelectAddReusableFunction = () => {
        setIsNew(true);
        // setShowFunctionConfigForm(true);
        handleNewObjectMethod();
    };

    const onSelectAddHandler = () => {
        setIsNew(true);
        setShowFunctionConfigForm(true);
    };

    const onSelectAddInitFunction = () => {
        // TODO: Implement add init function functionality
    };

    const handleAddDropdownOption = (option: string) => {
        switch (option) {
            case ADD_REUSABLE_FUNCTION:
                onSelectAddReusableFunction();
                break;
            case ADD_INIT_FUNCTION:
                onSelectAddInitFunction();
                break;
            case ADD_HANDLER:
                onSelectAddHandler();
                break;
        }
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

    /**
     * This function invokes when a new function is added using right panel form.
     * 
     * @param value 
     */
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

    const handleInitFunctionClose = () => {
        setIsNew(false);
    };

    const handleAddHandleClose = () => {
        setIsNew(false);
    };

    const handleServiceTryIt = () => {
        const basePath = serviceModel.properties?.basePath?.value?.trim();
        const listener = serviceModel.properties?.listener?.value?.trim();
        const commands = ["ballerina.tryIt", false, undefined, { basePath, listener }];
        rpcClient.getCommonRpcClient().executeCommand({ commands });
    }

    const handleExportOAS = () => {
        rpcClient.getServiceDesignerRpcClient().exportOASFile({});
    };

    const handleAddListener = () => {
        // TODO: Implement add listener functionality
        console.log("Add listener clicked");
    };

    const handleFieldEdit = () => {
    };

    const handleFieldDelete = () => {
    };

    const handleAddServiceField = () => {
        // TODO: Implement add service field functionality
        console.log("Add service field clicked");
    };

    const findIcon = (label: string) => {
        label = label.toLowerCase();
        switch (true) {
            case label.includes("listener"):
                return "bell";
            case label.includes("path") || label.includes("base"):
                return "link";
            case label.includes("port"):
                return "ports";
            case label.includes("host"):
                return "server";
            case label.includes("name") || label.includes("queue"):
                return "tag";
            case label.includes("timeout"):
                return "clock";
            case label.includes("ssl") || label.includes("secure"):
                return "lock";
            case label.includes("config"):
                return "gear";
            default:
                return "info";
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    };

    const haveServiceTypeName = serviceModel?.properties["serviceTypeName"]?.value;

    const ListenerList = () => {
        const listenerLabel = listeners.length > 1 ? "Listeners" : "Listener";
        return (
            <>
                <ListenerHeader>
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                        {listenerLabel}
                    </Typography>
                    <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                        {listenerLabel} connected to the service
                    </Typography>
                </ListenerHeader>
                <ListenerContent>
                    {
                        listeners.map((listener, index) => (
                            <ListenerItem key={`${index}-listener`} onClick={() => handleOpenListener(listener)}
                                style={{ cursor: 'pointer' }}
                            >
                                <ListenerIcon className="listener-icon">
                                    <Icon name="radio-tower" isCodicon sx={{ fontSize: 16 }} />
                                </ListenerIcon>
                                <Typography 
                                    variant="body2"
                                    className="listener-text"
                                    sx={{
                                        transition: 'color 0.2s ease'
                                    }}
                                >
                                    {listener}
                                </Typography>
                                <Icon name="kebab-vertical" isCodicon sx={{ fontSize: 14, marginLeft: 'auto' }} />
                            </ListenerItem>
                        ))
                    }
                </ListenerContent>
            </>
        );
    }

    return (
        <View>
            <TopNavigationBar />
            {!serviceModel && (
                <LoadingContainer>
                    <LoadingRing message="Loading Service..." />
                </LoadingContainer>
            )}
            {
                serviceModel && (
                    <>
                        <TitleBar
                            title={serviceModel.displayName || "Service Designer"}
                            subtitle={"Implement and configure your service"}
                            actions={
                                <>
                                    <Button appearance="secondary" tooltip="Edit Service" onClick={handleServiceEdit}>
                                        <Codicon name="settings-gear" sx={{ marginRight: 8, fontSize: 16 }} /> Configure
                                    </Button>
                                    {
                                        serviceModel && isHttpService && (
                                            <>
                                                <Button appearance="secondary" tooltip="Try Service" onClick={handleServiceTryIt}>
                                                    <Icon name="play" isCodicon={true} sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Try It</ButtonText>
                                                </Button>
                                                <Button appearance="secondary" tooltip="Export OpenAPI Spec" onClick={handleExportOAS}>
                                                    <Icon name="bi-export" sx={{ marginRight: 8, fontSize: 16 }} /> <ButtonText>Export</ButtonText>
                                                </Button>
                                                {/* {
                                                    !haveServiceTypeName && (
                                                        <Button appearance="primary" tooltip="Add Resource" onClick={handleNewResourceFunction}>
                                                            <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Resource</ButtonText>
                                                        </Button>
                                                    )
                                                } */}
                                            </>
                                        )
                                    }
                                    {serviceModel && (
                                        <AddServiceElementDropdown
                                            buttonTitle="Add"
                                            toolTip="Add Function or Handler"
                                            defaultOption="reusable-function"
                                            onOptionChange={handleAddDropdownOption}
                                            options={dropdownOptions}
                                        />
                                    )}
                                </>
                            }
                        />

                        <ServiceContainer>
                            {/* Listing Listener and Service Configurations */}
                            <ServiceMetadataContainer>
                                <ListenerSection>
                                    <ListenerList />
                                </ListenerSection>
                                {readonlyProperties.size > 0 && (
                                    <PropertiesSection>
                                        {
                                            Array.from(readonlyProperties).map(prop => (
                                                <PropertyItem key={prop.label}>
                                                    <PropertyLabel>
                                                        <Icon name={findIcon(prop.label)} isCodicon sx={{ fontSize: 14, color: 'var(--vscode-symbolIcon-propertyForeground)' }} />
                                                        <Typography variant="body3" sx={{ fontWeight: 'medium', color: 'var(--vscode-foreground)' }}>
                                                            {prop.label}
                                                        </Typography>
                                                    </PropertyLabel>
                                                    <PropertyValue>
                                                        <Typography variant="body3" sx={{ color: 'var(--vscode-editor-foreground)' }}>
                                                            {Array.isArray(prop.value) ? prop.value.join(", ") : prop.value}
                                                        </Typography>
                                                    </PropertyValue>
                                                </PropertyItem>
                                            ))
                                        }
                                    </PropertiesSection>
                                )}
                            </ServiceMetadataContainer>

                            {/* Listing Resources in HTTP */}
                            {isHttpService && (
                                <>
                                    <SectionHeader
                                        title="Resource Endpoints"
                                        subtitle="Define how the service responds to HTTP requests"
                                    >
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {resources.length > 10 && (
                                                <TextField placeholder="Search..." sx={{ width: 200 }} onChange={handleSearch} value={searchValue} />
                                            )}
                                            {/* {!haveServiceTypeName && (
                                                <Button appearance="primary" tooltip="Add Resource" onClick={handleNewResourceFunction}>
                                                    <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Resource</ButtonText>
                                                </Button>
                                            )} */}
                                        </div>
                                    </SectionHeader>
                                    <FunctionsContainer>
                                        {/* Add Resource Function - Dotted Accordion */}
                                        {!haveServiceTypeName && (
                                            <ResourceAccordionV2
                                                key="add-resource"
                                                resource={{
                                                    id: "add-resource",
                                                    name: "Add Resource Function",
                                                    path: "",
                                                    type: "placeholder",
                                                    icon: "post-api",
                                                    position: {
                                                        startLine: 0,
                                                        startColumn: 0,
                                                        endLine: 0,
                                                        endColumn: 0
                                                    }
                                                }}
                                                readOnly={false}
                                                isPlaceholder={true}
                                                onEditResource={() => handleNewResourceFunction()}
                                                onDeleteResource={() => { }}
                                                onResourceImplement={() => handleNewResourceFunction()}
                                            />
                                        )}
                                        {resources
                                            .filter((resource) => {
                                                const search = searchValue.toLowerCase();
                                                const nameMatch = resource.name && resource.name.toLowerCase().includes(search);
                                                const iconMatch = resource.icon && resource.icon.toLowerCase().includes(search);
                                                return nameMatch || iconMatch;
                                            })
                                            .map((resource, index) => (
                                                <ResourceAccordionV2
                                                    key={`${index}-${resource.name}`}
                                                    resource={resource}
                                                    readOnly={serviceModel.properties.hasOwnProperty('serviceTypeName')}
                                                    onEditResource={handleFunctionEdit}
                                                    onDeleteResource={handleFunctionDelete}
                                                    onResourceImplement={handleOpenDiagram}
                                                />
                                            ))}
                                    </FunctionsContainer>
                                </>
                            )}
                            {/* Listing service type bound functions */}
                            {!isHttpService && enabledHandlers.length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Event Handlers"
                                        subtitle="Define how the service responds to events"
                                    />
                                    <FunctionsContainer>
                                        {enabledHandlers.map((functionModel, index) => (
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

                            {/* Listing service type bound functions */}
                            {(initMethod && (
                                <>
                                    <SectionHeader
                                        title="Initialization Function"
                                        subtitle="Define the initialization logic for the service"
                                    />
                                    <FunctionsContainer>
                                        <ResourceAccordion
                                            key={`init-${initMethod.name.value}`}
                                            functionModel={initMethod}
                                            goToSource={() => { }}
                                            onEditResource={handleFunctionEdit}
                                            onDeleteResource={handleFunctionDelete}
                                            onResourceImplement={handleOpenDiagram}
                                        />
                                    </FunctionsContainer>
                                </>
                            ))}

                            {/* Listing service type bound functions */}
                            {(objectMethods.length > 0 && (
                                <>
                                    <SectionHeader
                                        title="Functions"
                                        subtitle="Reusable functions within the service"
                                    />
                                    <FunctionsContainer>
                                        {objectMethods.map((functionModel, index) => (
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
                            ))}

                            {/* This is for adding or editing a http resource */}
                            {functionModel && isHttpService && functionModel.kind === "RESOURCE" && (
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

                            {/* This is for editing a remote or resource function */}
                            {functionModel && !isHttpService && (
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

                            {/* This is for adding a new handler to the service */}
                            {serviceModel && !isHttpService && (
                                <PanelContainer
                                    title={"Select Handler to Add"}
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
                    </>
                )
            }
        </View>
    );
}

interface SectionHeaderProps {
    title: string;
    subtitle: string;
    children?: React.ReactNode;
}

function SectionHeader({ title, subtitle, children }: SectionHeaderProps) {
    return (
        <HeaderContainer>
            <div>
                <Typography
                    variant="h3"
                    sx={{ marginLeft: 10, fontWeight: 'bold' }}
                >
                    {title}
                </Typography>
                <Typography
                    variant="body3"
                    sx={{ marginLeft: 10, color: 'var(--vscode-descriptionForeground)' }}
                >
                    {subtitle}
                </Typography>
            </div>
            {children}
        </HeaderContainer>
    );
}
