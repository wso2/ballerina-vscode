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
    FieldType,
} from "@wso2/ballerina-core";
import { Button, Codicon, Icon, LinkButton, Typography, View, TextField, DropdownButton } from "@wso2/ui-toolkit";
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
import { ResourceAccordionV2 } from "./components/ResourceAccordionV2";

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

const HeaderContainer = styled.div`
    display: flex;
    padding: 15px;
    align-items: center;
    justify-content: space-between;
`;

const ListenerContainer = styled.div`
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
`;

const ListenerIcon = styled.div`
    width: 32px;
    height: 32px;
    background-color: var(--vscode-editor-background);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const PropertiesSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
    flex: 1;
    padding-left: 20px;
    border-left: 1px solid var(--vscode-editorIndentGuide-background);
`;

const PropertyItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PropertyLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PropertyValue = styled.div`
    display: flex;
    align-items: center;
`;

// ServiceFieldsContainer and ServiceFieldsHeader are no longer needed as the table is now inside PropertiesSection

const ServiceFieldsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    background-color: var(--vscode-editor-background);
`;

const TableHeader = styled.th`
    padding: 12px 8px;
    text-align: left;
    border-bottom: 1px solid var(--vscode-editorIndentGuide-background);
    background-color: var(--vscode-editorWidget-background);
    font-weight: 500;
`;

const TableRow = styled.tr`
    border-bottom: 1px solid var(--vscode-editorIndentGuide-background);
    
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const TableCell = styled.td`
    padding: 12px 8px;
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ActionButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--vscode-foreground);
    transition: all 0.2s ease;
    
    &:hover {
        background-color: var(--vscode-button-hoverBackground);
        color: var(--vscode-button-foreground);
    }
    
    &:active {
        background-color: var(--vscode-button-background);
    }
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

interface ServiceField {
    name: string;
    type: string;
    isPrivate?: boolean;
    isFinal?: boolean;
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
    const [showInitFunctionForm, setShowInitFunctionForm] = useState<boolean>(false);
    const [showFieldForm, setShowFieldForm] = useState<boolean>(false);
    const [projectListeners, setProjectListeners] = useState<ProjectStructureArtifactResponse[]>([]);
    const prevPosition = useRef(position);

    const [resources, setResources] = useState<ProjectStructureArtifactResponse[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [listeners, setListeners] = useState<string[]>([]);
    const [readonlyProperties, setReadonlyProperties] = useState<Set<ReadonlyProperty>>(new Set());
    const [serviceFields, setServiceFields] = useState<ServiceField[]>([]);
    const [isHttpService, setIsHttpService] = useState<boolean>(false);

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

        // Extract service fields if available (for service classes)
        setServiceFields([{ name: "field1", type: "string" }, { name: "field2", type: "int" }]);
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

    const handleNewFunction = () => {
        setIsNew(true);
        setShowFunctionConfigForm(true);
    };

    const handleNewInitFunction = () => {
        setIsNew(true);
        setShowInitFunctionForm(true);
    };

    const handleNewField = () => {
        setIsNew(true);
        setShowFieldForm(true);
    };

    const handleAddDropdownOption = (option: string) => {
        switch (option) {
            case "reusable-function":
                handleNewFunction();
                break;
            case "init-function":
                handleNewInitFunction();
                break;
            case "field":
                handleNewField();
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
        setShowInitFunctionForm(false);
    };

    const handleFieldClose = () => {
        setIsNew(false);
        setShowFieldForm(false);
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

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    };

    const haveServiceTypeName = serviceModel?.properties["serviceTypeName"]?.value;

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
                                                {
                                                    !haveServiceTypeName && (
                                                        <Button appearance="primary" tooltip="Add Resource" onClick={handleNewResourceFunction}>
                                                            <Codicon name="add" sx={{ marginRight: 8 }} /> <ButtonText>Resource</ButtonText>
                                                        </Button>
                                                    )
                                                }
                                            </>
                                        )
                                    }
                                    {serviceModel && !isHttpService && (
                                        <div style={{ position: 'relative', zIndex: 1000 }}>
                                            <DropdownButton
                                                buttonContent={
                                                    <>
                                                        <Codicon name="add" sx={{ marginRight: 8 }} />
                                                        <ButtonText>Add</ButtonText>
                                                    </>
                                                }
                                                selecteOption="reusable-function"
                                                tooltip="Add Function or Fields"
                                                dropDownAlign="bottom"
                                                buttonSx={{
                                                    appearance: 'none',
                                                    backgroundColor: 'var(--vscode-button-background)',
                                                    color: 'var(--vscode-button-foreground)',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--vscode-button-hoverBackground)',
                                                    }
                                                }}
                                                optionButtonSx={{
                                                    backgroundColor: 'var(--vscode-button-background)',
                                                    borderColor: 'var(--vscode-button-border)',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--vscode-button-hoverBackground)',
                                                    }
                                                }}
                                                dropdownSx={{
                                                    zIndex: 9999,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                    border: '1px solid var(--vscode-dropdown-border)',
                                                    backgroundColor: 'var(--vscode-dropdown-background)',
                                                    minWidth: '280px',
                                                    position: 'absolute',
                                                    right: '0',
                                                    left: 'auto'
                                                }}
                                                onOptionChange={handleAddDropdownOption}
                                                onClick={() => {}}
                                                options={[
                                                    {
                                                        content: (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 8px' }}>
                                                                <Codicon name="symbol-method" sx={{ fontSize: 16, color: 'var(--vscode-symbolIcon-functionForeground)' }} />
                                                                <div>
                                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Add Reusable Function</Typography>
                                                                    <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                                                        Create a new reusable function
                                                                    </Typography>
                                                                </div>
                                                            </div>
                                                        ),
                                                        value: "reusable-function",
                                                    },
                                                    {
                                                        content: (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 8px' }}>
                                                                <Codicon name="gear" sx={{ fontSize: 16, color: 'var(--vscode-symbolIcon-constructorForeground)' }} />
                                                                <div>
                                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Add Init Function</Typography>
                                                                    <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                                                        Create an initialization function
                                                                    </Typography>
                                                                </div>
                                                            </div>
                                                        ),
                                                        value: "init-function",
                                                    },
                                                    {
                                                        content: (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 8px' }}>
                                                                <Codicon name="symbol-field" sx={{ fontSize: 16, color: 'var(--vscode-symbolIcon-fieldForeground)' }} />
                                                                <div>
                                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Add Field</Typography>
                                                                    <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                                                        Add a new service field
                                                                    </Typography>
                                                                </div>
                                                            </div>
                                                        ),
                                                        value: "field",
                                                    }
                                                ]}
                                            />
                                        </div>
                                    )}
                                </>
                            }
                        />

                        <ServiceContainer>
                            <ListenerContainer>
                                <ListenerSection>
                                    <ListenerHeader>
                                        <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                                            {listeners.length > 1 ? 'Listeners' : 'Listener'}
                                        </Typography>
                                        <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                            Connected {listeners.length > 1 ? 'listeners' : 'listener'} to the service
                                        </Typography>
                                    </ListenerHeader>
                                    <ListenerContent>
                                        {
                                            listeners.map((listener, index) => (
                                                <ListenerItem
                                                    key={`${index}-listener`}
                                                    onClick={() => handleOpenListener(listener)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <ListenerIcon>
                                                        {
                                                            serviceModel.icon && (
                                                                <img src={serviceModel.icon} alt={listener} style={{ width: "38px" }} />
                                                            )
                                                        }
                                                        {
                                                            !serviceModel.icon && (
                                                                <Icon name="bell" isCodicon sx={{ fontSize: 16 }} />
                                                            )
                                                        }
                                                    </ListenerIcon>
                                                    <Typography variant="body2">
                                                        {listener}
                                                    </Typography>
                                                    <Icon name="kebab-vertical" isCodicon sx={{ fontSize: 14, marginLeft: 'auto' }} />
                                                </ListenerItem>
                                            ))
                                        }
                                    </ListenerContent>
                                </ListenerSection>
                                {readonlyProperties.size > 0 && (
                                    <PropertiesSection>
                                        {
                                            Array.from(readonlyProperties).map(prop => (
                                                <PropertyItem key={prop.label}>
                                                    <PropertyLabel>
                                                        <Typography variant="body3" sx={{ fontWeight: 'medium' }}>
                                                            {prop.label}:
                                                        </Typography>
                                                    </PropertyLabel>
                                                    <PropertyValue>
                                                        <Typography variant="body3">
                                                            {Array.isArray(prop.value) ? prop.value.join(", ") : prop.value}
                                                        </Typography>
                                                    </PropertyValue>
                                                </PropertyItem>
                                            ))
                                        }

                                        {/* Service Fields Table */}
                                        {serviceFields.length > 0 && (
                                            <div style={{ marginTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                    <div>
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                            Service Fields
                                                        </Typography>
                                                        <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                                            Fields defined in the service class
                                                        </Typography>
                                                    </div>
                                                </div>

                                                <ServiceFieldsTable>
                                                    <thead>
                                                        <tr>
                                                            <TableHeader>Type</TableHeader>
                                                            <TableHeader>Field Name</TableHeader>
                                                            <TableHeader>Actions</TableHeader>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {serviceFields.map((field, index) => (
                                                            <TableRow key={`field-${index}`}>
                                                                <TableCell>
                                                                    <Typography variant="body3">
                                                                        {field.type}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body3" sx={{ fontWeight: 'medium' }}>
                                                                        {field.name}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <ActionButtons>
                                                                        <ActionButton
                                                                            onClick={() => handleFieldEdit()}
                                                                            title="Edit Field"
                                                                        >
                                                                            <Icon name="edit" isCodicon sx={{ fontSize: 12 }} />
                                                                        </ActionButton>
                                                                        <ActionButton
                                                                            onClick={() => handleFieldDelete()}
                                                                            title="Delete Field"
                                                                        >
                                                                            <Icon name="trash" isCodicon sx={{ fontSize: 12 }} />
                                                                        </ActionButton>
                                                                    </ActionButtons>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </tbody>
                                                </ServiceFieldsTable>
                                            </div>
                                        )}
                                    </PropertiesSection>
                                )}
                            </ListenerContainer>
                            <HeaderContainer>
                                <div>
                                    <Typography
                                        key={"title"}
                                        variant="h3"
                                        sx={{ marginLeft: 10, fontWeight: 'bold' }}
                                    >
                                        {isHttpService ? "Resource Functions" : "Trigger Functions"}
                                    </Typography>
                                    <Typography key={"body"} variant="body3"
                                        sx={{ marginLeft: 10, color: 'var(--vscode-descriptionForeground)' }}
                                    >
                                        {isHttpService ? "Resource functions to handle HTTP requests" : "Enable trigger functions to handle events"}
                                    </Typography>
                                </div>

                                {isHttpService && resources.length > 10 && (
                                    <TextField placeholder="Search..." sx={{ width: 200 }} onChange={handleSearch} value={searchValue} />
                                )}
                            </HeaderContainer>
                            {/* Listing Resources in HTTP */}
                            {isHttpService && (
                                <FunctionsContainer>
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
                            )}
                            {/* Listing service type bound functions */}
                            {!isHttpService && (
                                <FunctionsContainer>
                                    {serviceModel.functions
                                        .filter((functionModel) => functionModel.kind === "REMOTE")
                                        .map((functionModel, index) => (
                                            <ResourceAccordion
                                                key={`${index}-${functionModel.name.value}`}
                                                functionModel={functionModel}
                                                goToSource={() => { }}
                                                onEditResource={handleFunctionEdit}
                                                onDeleteResource={handleFunctionDelete}
                                                onResourceImplement={handleOpenDiagram}
                                                showDottedBorder={!functionModel.enabled}
                                                showEnableButton={!functionModel.enabled}
                                                showDeleteIcon={functionModel.enabled}
                                                showEditIcon={functionModel.enabled}
                                                onEnable={(func: FunctionModel) => {
                                                    const updatedFunc = { ...func, enabled: true };
                                                    handleFunctionSubmit(updatedFunc);
                                                }}
                                            />
                                        ))}
                                </FunctionsContainer>
                            )}

                            <HeaderContainer>
                                <div>
                                    <Typography
                                        key={"title"}
                                        variant="h3"
                                        sx={{ marginLeft: 10, fontWeight: 'bold' }}
                                    >
                                        Functions
                                    </Typography>
                                    <Typography
                                        key={"body"}
                                        variant="body3"
                                        sx={{ marginLeft: 10, color: 'var(--vscode-descriptionForeground)' }}
                                    >
                                        Reusable functions within the service
                                    </Typography>
                                </div>
                            </HeaderContainer>
                            {/* Listing service type bound functions */}
                            {(
                                <FunctionsContainer>
                                    {serviceModel.functions
                                        .filter((functionModel) => functionModel.kind === "DEFAULT")
                                        .map((functionModel, index) => (
                                            <ResourceAccordion
                                                key={`${index}-${functionModel.name.value}`}
                                                functionModel={functionModel}
                                                goToSource={() => { }}
                                                onEditResource={handleFunctionEdit}
                                                onDeleteResource={handleFunctionDelete}
                                                onResourceImplement={handleOpenDiagram}
                                                showDottedBorder={!functionModel.enabled}
                                                showEnableButton={!functionModel.enabled}
                                                showDeleteIcon={functionModel.enabled}
                                                showEditIcon={functionModel.enabled}
                                                onEnable={(func: FunctionModel) => {
                                                    const updatedFunc = { ...func, enabled: true };
                                                    handleFunctionSubmit(updatedFunc);
                                                }}
                                            />
                                        ))}
                                </FunctionsContainer>
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

                            {serviceModel && !isHttpService && (
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

                            {/* Init Function Form Panel */}
                            {serviceModel && !isHttpService && (
                                <PanelContainer
                                    title={"Init Function Configuration"}
                                    show={showInitFunctionForm}
                                    onClose={handleInitFunctionClose}
                                    width={600}
                                >
                                    <div style={{ padding: '20px' }}>
                                        <Typography variant="body1" sx={{ marginBottom: '16px' }}>
                                            Configure the initialization function for your service
                                        </Typography>
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                            <Button appearance="primary" onClick={() => {
                                                // TODO: Implement init function creation logic
                                                console.log("Creating init function...");
                                                handleInitFunctionClose();
                                            }}>
                                                Create Init Function
                                            </Button>
                                            <Button appearance="secondary" onClick={handleInitFunctionClose}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </PanelContainer>
                            )}

                            {/* Field Form Panel */}
                            {serviceModel && !isHttpService && (
                                <PanelContainer
                                    title={"Add Service Field"}
                                    show={showFieldForm}
                                    onClose={handleFieldClose}
                                    width={600}
                                >
                                    <div style={{ padding: '20px' }}>
                                        <Typography variant="body1" sx={{ marginBottom: '16px' }}>
                                            Add a new field to your service
                                        </Typography>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                            <TextField 
                                                placeholder="Field name" 
                                                sx={{ width: '100%' }}
                                            />
                                            <TextField 
                                                placeholder="Field type (e.g., string, int, boolean)" 
                                                sx={{ width: '100%' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <Button appearance="primary" onClick={() => {
                                                // TODO: Implement field creation logic
                                                console.log("Creating field...");
                                                handleFieldClose();
                                            }}>
                                                Add Field
                                            </Button>
                                            <Button appearance="secondary" onClick={handleFieldClose}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </PanelContainer>
                            )}
                        </ServiceContainer>
                    </>
                )
            }
        </View>
    );
}
