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

import { Type, ServiceClassModel, ModelFromCodeRequest, FieldType, FunctionModel, NodePosition, STModification, removeStatement, LineRange, EVENT_TYPE } from "@wso2/ballerina-core";
import { Button, Codicon, Typography, TextField, ProgressRing, Menu, MenuItem, Popover, Item, ThemeColors, LinkButton } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { LoadingContainer } from "../../styles";
import { OperationForm } from "../../GraphQLDiagram/OperationForm";

import { URI, Utils } from "vscode-uri";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { applyModifications } from "../../../utils/utils";
import { Icon } from "@wso2/ui-toolkit";
import { FieldCard } from "./FieldCard";
import { debounce } from "lodash";


const ServiceContainer = styled.div`
    display: flex;
    padding: 10px 20px;
    gap: 16px;
    flex-direction: column;
    height: 100%;
`;

const ScrollableSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    height: 100%;
    flex: 1;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 75px;
`;

const ScrollableContent = styled.div`
    overflow-y: auto;
    min-height: 55px;
`;

const SectionTitle = styled.div`
    font-size: 14px;
    font-family: GilmerRegular;
    margin-bottom: 10px;
    padding: 8px 0;
`;

const SectionHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    width: 100%;
`;

const EmptyStateText = styled(Typography)`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    padding: 12px;
    text-align: center;
`;

const EditRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    width: 100%;
`;

const InputWrapper = styled.div`
    position: relative;
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: flex-start;
`;

const TextFieldWrapper = styled.div`
    flex: 1;
`;

const EditButton = styled(Button)`
    margin-top: 39px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 2px; 
    margin-top: 38px;
`;

const StyledButton = styled(Button)`
    font-size: 14px;
`;

const WarningText = styled(Typography)`
    color: var(--vscode-textLink-foreground);
    font-size: 12px;
    margin-top: 4px;
`;

const EditableRow = styled.div`
    display: flex;
    align-items: flex-start;
    width: 100%;
    flex-direction: column;
`;

const ViewText = styled(Typography)`
    color: ${ThemeColors.ON_SURFACE};
    font-size: 13px;
`;

const SwitchImplementRow = styled.div`
    display: flex;
    gap: 10px;
    justify-content: flex-start;
    align-items: center;
    padding: 10px 0;
`;

interface GraphqlObjectViewerProps {
    type: Type;
    onClose: () => void;
    onImplementation: (type: Type) => void;
    projectUri: string;
    serviceIdentifier: string;
}

export function GraphqlObjectViewer(props: GraphqlObjectViewerProps) {
    const { onClose, type, projectUri, onImplementation, serviceIdentifier } = props;
    const { rpcClient } = useRpcContext();
    const [serviceClassModel, setServiceClassModel] = useState<ServiceClassModel>();
    const [editingFunction, setEditingFunction] = useState<FunctionModel>(undefined);
    const [isNew, setIsNew] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState("");
    const [nameError, setNameError] = useState("");
    const [isTypeNameValid, setIsTypeNameValid] = useState(true);
    const classNameField = serviceClassModel?.properties["name"];
    const saveButtonClicked = useRef(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getServiceClassModel();
    }, [type]);

    const getServiceClassModel = async () => {
        if (!type) return;
        const currentFilePath = Utils.joinPath(URI.file(projectUri), type.codedata.lineRange.fileName).fsPath;
        const serviceClassModelRequest: ModelFromCodeRequest = {
            filePath: currentFilePath,
            codedata: {
                lineRange: {
                    startLine: { line: type.codedata.lineRange.startLine.line, offset: type.codedata.lineRange.startLine.offset },
                    endLine: { line: type.codedata.lineRange.endLine.line, offset: type.codedata.lineRange.endLine.offset }
                }
            },
            context: "GRAPHQL_DIAGRAM"
        }

        const serviceClassModelResponse = await rpcClient.getBIDiagramRpcClient().getServiceClassModel(serviceClassModelRequest);
        setServiceClassModel(serviceClassModelResponse.model);
    }

    const handleEditFunction = (func: FunctionModel) => {
        setEditingFunction(func);
    };

    const handleDeleteFunction = async (func: FunctionModel) => {
        const targetPosition: NodePosition = {
            startLine: func?.codedata?.lineRange?.startLine.line,
            startColumn: func?.codedata.lineRange?.startLine?.offset,
            endLine: func?.codedata?.lineRange?.endLine?.line,
            endColumn: func?.codedata?.lineRange?.endLine?.offset
        }
        const deleteAction: STModification = removeStatement(targetPosition);
        const currentFilePath = Utils.joinPath(URI.file(projectUri), type.codedata.lineRange.fileName).fsPath;
        await applyModifications(rpcClient, [deleteAction], currentFilePath);
        getServiceClassModel();
    }

    const onFunctionImplement = async (func: FunctionModel) => {
        const lineRange: LineRange = func.codedata.lineRange;
        const currentFilePath = Utils.joinPath(URI.file(projectUri), type.codedata.lineRange.fileName).fsPath;
        const nodePosition: NodePosition = {
            startLine: lineRange.startLine.line,
            startColumn: lineRange.startLine.offset,
            endLine: lineRange.endLine.line,
            endColumn: lineRange.endLine.offset
        }

        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                position: nodePosition,
                documentUri: currentFilePath
            }
        })
    }

    const handleFunctionSave = async (updatedFunction: FunctionModel) => {
        try {
            setIsSaving(true);
            let artifacts;
            const currentFilePath = Utils.joinPath(URI.file(projectUri), serviceClassModel.codedata.lineRange.fileName).fsPath;
            if (isNew) {
                artifacts = await rpcClient.getServiceDesignerRpcClient().addFunctionSourceCode({
                    filePath: currentFilePath,
                    codedata: {
                        lineRange: {
                            startLine: {
                                line: serviceClassModel.codedata.lineRange.startLine.line,
                                offset: serviceClassModel.codedata.lineRange.startLine.offset
                            },
                            endLine: {
                                line: serviceClassModel.codedata.lineRange.endLine.line,
                                offset: serviceClassModel.codedata.lineRange.endLine.offset
                            }
                        }
                    },
                    function: updatedFunction
                });
            } else {
                artifacts = await rpcClient.getServiceDesignerRpcClient().updateResourceSourceCode({
                    filePath: currentFilePath,
                    codedata: {
                        lineRange: {
                            startLine: {
                                line: serviceClassModel.codedata.lineRange.startLine.line,
                                offset: serviceClassModel.codedata.lineRange.startLine.offset
                            },
                            endLine: {
                                line: serviceClassModel.codedata.lineRange.endLine.line,
                                offset: serviceClassModel.codedata.lineRange.endLine.offset
                            }
                        }
                    },
                    function: updatedFunction
                });
            }

            const serviceArtifact = artifacts.artifacts.find(artifact => artifact.name === serviceIdentifier);
            // Update the state machine context to the updated service artifact
            await rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { documentUri: serviceArtifact.path, position: serviceArtifact.position } });

            if (isNew) {
                setIsNew(false);
            }
            setEditingFunction(null);
            getServiceClassModel();
        } catch (error) {
            console.error('Error updating function:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFunction = async () => {
        const lsResponse = await rpcClient.getServiceDesignerRpcClient().getFunctionModel({
            type: 'graphql',
            functionName: 'query'
        });
        if (lsResponse.function) {
            // if resouce we need to update the models accessor value to get and valueType to Identifier
            if (lsResponse.function.accessor) {
                lsResponse.function.accessor.value = 'get';
                lsResponse.function.accessor.valueType = 'IDENTIFIER';
            }

            setIsNew(true);
            setEditingFunction(lsResponse.function);
        }
    };

    const handleCloseFunctionForm = () => {
        setEditingFunction(undefined);
        setIsNew(false);
    };


    const startEditing = () => {
        setTempName(serviceClassModel.properties["name"].value);
        saveButtonClicked.current = false;
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setTempName("");
    };

    const editServiceClassName = async () => {
        saveButtonClicked.current = true;
        if (!tempName || tempName === serviceClassModel.properties["name"].value) {
            cancelEditing();
            return;
        }

        try {
            setIsSaving(true);
            await rpcClient.getBIDiagramRpcClient().renameIdentifier({
                fileName: serviceClassModel.codedata.lineRange.fileName,
                position: {
                    line: serviceClassModel.properties["name"].codedata.lineRange.startLine.line,
                    character: serviceClassModel.properties["name"].codedata.lineRange.startLine.offset
                },
                newName: tempName
            });

            setServiceClassModel({
                ...serviceClassModel,
                name: tempName,
                properties: {
                    ...serviceClassModel.properties,
                    name: {
                        ...serviceClassModel.properties["name"],
                        value: tempName
                    }
                }
            });

            cancelEditing();
        } catch (error) {
            console.error('Error renaming service class (Graphql Object):', error);
        } finally {
            setIsSaving(false);
        }
    };

    const validateTypeName = useCallback(debounce(async (value: string) => {
        if (saveButtonClicked.current || !serviceClassModel) {
            return;
        }

        const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
            filePath: serviceClassModel?.codedata?.lineRange?.fileName || "types.bal",
            context: {
                expression: value,
                startLine: {
                    line: serviceClassModel?.codedata?.lineRange?.startLine?.line,
                    offset: serviceClassModel?.codedata?.lineRange?.startLine?.offset
                },
                offset: 0,
                lineOffset: 0,
                codedata: {
                    node: "VARIABLE",
                    lineRange: {
                        startLine: {
                            line: serviceClassModel?.codedata?.lineRange?.startLine?.line,
                            offset: serviceClassModel?.codedata?.lineRange?.startLine?.offset
                        },
                        endLine: {
                            line: serviceClassModel?.codedata?.lineRange?.endLine?.line,
                            offset: serviceClassModel?.codedata?.lineRange?.endLine?.offset
                        },
                        fileName: serviceClassModel?.codedata?.lineRange?.fileName
                    },
                },
                property: serviceClassModel?.properties["name"] ?
                    {
                        metadata: {
                            label: serviceClassModel.properties["name"].metadata.label || "",
                            description: serviceClassModel.properties["name"].metadata.description || ""
                        },
                        valueType: serviceClassModel.properties["name"].valueType || "IDENTIFIER",
                        value: serviceClassModel.properties["name"].value || "",
                        valueTypeConstraint: "Global",
                        optional: serviceClassModel.properties["name"].optional || false,
                        editable: serviceClassModel.properties["name"].editable || true
                    } :
                    {
                        metadata: {
                            label: "",
                            description: "",
                        },
                        valueType: "IDENTIFIER",
                        value: "",
                        valueTypeConstraint: "Global",
                        optional: false,
                        editable: true
                    }
            }
        });

        if (response && response.diagnostics && response.diagnostics.length > 0) {
            setNameError(response.diagnostics[0].message);
            setIsTypeNameValid(false);
        } else {
            setNameError("");
            setIsTypeNameValid(true);
        }
    }, 250), [rpcClient, serviceClassModel]);

    const handleOnBlur = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!saveButtonClicked.current) {
            await validateTypeName(e.target.value);
        }
    };

    const handleOnFieldFocus = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await validateTypeName(e.target.value);
    };

    const handleOnTypeNameUpdate = (value: string) => {
        setTempName(value);
        validateTypeName(value);
    }

    return (
        <>
            {!serviceClassModel && (
                <LoadingContainer>
                    <ProgressRing />
                    <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading Graphql Object Visualizer...</Typography>
                </LoadingContainer>
            )}
            {serviceClassModel && !editingFunction && (
                <PanelContainer title={"Edit Type : Object"} show={true} onClose={onClose} onBack={onClose} width={400}>
                    <ServiceContainer>


                        {!classNameField.editable && !isEditing && (
                            <InputWrapper>
                                <TextFieldWrapper>
                                    <TextField
                                        id={classNameField.value}
                                        name={classNameField.value}
                                        value={classNameField.value}
                                        label={classNameField.metadata.label}
                                        required={!classNameField.optional}
                                        description={classNameField.metadata.description}
                                        placeholder={classNameField.placeholder}
                                        readOnly={!classNameField.editable}
                                    />
                                </TextFieldWrapper>
                                <EditButton appearance="icon" onClick={startEditing} tooltip="Rename">
                                    <Icon name="bi-edit" sx={{ width: 18, height: 18, fontSize: 18 }} />
                                </EditButton>
                            </InputWrapper>
                        )}
                        {isEditing && (
                            <>
                                <EditableRow>
                                    <EditRow>
                                        <TextFieldWrapper>
                                            <TextField
                                                id={classNameField.value}
                                                label={classNameField.metadata.label}
                                                value={tempName}
                                                onBlur={handleOnBlur}
                                                onFocus={handleOnFieldFocus}
                                                onChange={(e) => handleOnTypeNameUpdate(e.target.value)}
                                                errorMsg={nameError}
                                                description={classNameField.metadata.description}
                                                required={!classNameField.optional}
                                                placeholder={classNameField.placeholder}
                                                autoFocus
                                            />
                                        </TextFieldWrapper>
                                        <ButtonGroup>
                                            <StyledButton
                                                appearance="secondary"
                                                onClick={cancelEditing}
                                                disabled={isSaving}
                                            >
                                                Cancel
                                            </StyledButton>
                                            <StyledButton
                                                appearance="primary"
                                                onClick={editServiceClassName}
                                                disabled={!tempName || !isTypeNameValid || isSaving}
                                            >
                                                {isSaving ? <Typography variant="progress">Saving...</Typography> : "Save"}
                                            </StyledButton>
                                        </ButtonGroup>
                                    </EditRow>

                                    <WarningText variant="body3">
                                        Note: Renaming will update all references across the project
                                    </WarningText>
                                </EditableRow>

                            </>
                        )}
                        <ScrollableSection>
                            <Section>
                                <SectionHeader>
                                    <SectionTitle>Fields</SectionTitle>
                                    <Button
                                        appearance="icon"
                                        tooltip="Add Field"
                                        onClick={() => handleAddFunction()}
                                    >
                                        <Codicon name="add" />
                                    </Button>
                                </SectionHeader>

                                <ScrollableContent>
                                    {serviceClassModel.functions?.map((func: FunctionModel, index: number) => (
                                        <FieldCard
                                            key={index}
                                            functionModel={func}
                                            goToSource={() => { }}
                                            onEditFunction={() => handleEditFunction(func)}
                                            onDeleteFunction={() => handleDeleteFunction(func)}
                                            onFunctionImplement={() => onFunctionImplement(func)}
                                        />
                                    ))}
                                    {(!serviceClassModel.functions || serviceClassModel.functions.length === 0) && (
                                        <EmptyStateText variant="body2">
                                            No fields found
                                        </EmptyStateText>
                                    )}
                                </ScrollableContent>
                            </Section>
                            {
                                <SwitchImplementRow>
                                    <ViewText variant="body3">Switch to Implementation View</ViewText>
                                    <Button appearance="primary" tooltip="Implement Object" onClick={() => onImplementation(type)}>
                                        <Codicon name="file-code" /> &nbsp; Implement
                                    </Button>
                                </SwitchImplementRow>
                            }
                        </ScrollableSection>

                    </ServiceContainer>
                </PanelContainer>
            )}
            {editingFunction && serviceClassModel && (
                <PanelContainer
                    title={isNew ? "Add Field" : "Edit Field"}
                    show={true}
                    onClose={() => setEditingFunction(undefined)}
                    onBack={() => setEditingFunction(undefined)}
                    width={400}
                >
                    <OperationForm
                        isSaving={isSaving}
                        model={editingFunction}
                        filePath={Utils.joinPath(URI.file(projectUri), serviceClassModel.codedata.lineRange.fileName).fsPath}
                        lineRange={serviceClassModel.codedata.lineRange}
                        isGraphqlView={true}
                        onClose={handleCloseFunctionForm}
                        onSave={handleFunctionSave}
                    />
                </PanelContainer>
            )}
        </>
    );
}
