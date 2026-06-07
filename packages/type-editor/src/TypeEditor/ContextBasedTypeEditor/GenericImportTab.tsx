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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextField, Button, TextArea, Typography, Icon, Codicon, LinkButton, ProgressRing } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BallerinaRpcClient, useRpcContext } from "@wso2/ballerina-rpc-client";
import { Type, EVENT_TYPE, JsonToTypeResponse, TypeDataWithReferences, PayloadContext, FormFieldInputType, Protocol } from "@wso2/ballerina-core";
import { debounce } from "lodash";
import { Utils, URI } from "vscode-uri";
import { ContentBody, StickyFooterContainer, FloatingFooter } from "./ContextTypeEditor";

const CategoryRow = styled.div<{ showBorder?: boolean }>`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
    padding-bottom: 14px;
    border-bottom: ${({ showBorder }) => (showBorder ? `1px solid var(--vscode-welcomePage-tileBorder)` : "none")};
`;

const TextFieldWrapper = styled.div`
    flex: 1;
`;

const InfoBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background-color: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
    margin-bottom: 20px;
`;

const InfoText = styled(Typography)`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
`;

const HeaderRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled(Typography)`
    font-weight: 500;
`;

const UploadButtonWrapper = styled.div`
    display: flex;
    gap: 8px;
`;

const ScrollableSection = styled.div`
    flex: 1;
    overflow-y: auto;
    max-height: 350px;
`;

const LoaderOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background-color: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(2px);
    border-radius: 4px;
    z-index: 10;
`;

enum DetectedFormat {
    JSON = "JSON",
    XML = "XML",
    UNKNOWN = "UNKNOWN",
    EMPTY = "EMPTY"
}

interface GenericImportTabProps {
    type: Type;
    onTypeSave: (type: Type) => void;
    isSaving: boolean;
    setIsSaving: (isSaving: boolean) => void;
    isPopupTypeForm: boolean;
    payloadContext?: PayloadContext;
    onTypeSelect: (type: Type | string) => void;
}

export function GenericImportTab(props: GenericImportTabProps) {
    const {
        type,
        onTypeSave,
        isSaving,
        setIsSaving,
        isPopupTypeForm,
        payloadContext,
        onTypeSelect
    } = props;

    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const [content, setContent] = useState<string>("");
    const [detectedFormat, setDetectedFormat] = useState<DetectedFormat>(DetectedFormat.EMPTY);
    const [importTypeName, setImportTypeName] = useState<string>(type.name);
    const [isTypeNameValid, setIsTypeNameValid] = useState<boolean>(true);
    const [nameError, setNameError] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(false);

    const { rpcClient } = useRpcContext();

    const supportedFormats = useMemo(
        () => payloadContext ? [DetectedFormat.JSON] : [DetectedFormat.JSON, DetectedFormat.XML],
        [payloadContext]);

    // Check user authentication status on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const authenticated = await rpcClient.getAiPanelRpcClient().isUserAuthenticated();
                setIsUserAuthenticated(authenticated);
            } catch (error) {
                console.error("Error checking user authentication:", error);
                setIsUserAuthenticated(false);
            }
        };
        checkAuthStatus();
    }, [rpcClient]);

    useEffect(() => {
        if (detectedFormat === DetectedFormat.JSON) {
            validateTypeName(importTypeName);
        } else if (detectedFormat === DetectedFormat.EMPTY) {
            setError("");
        } else if (detectedFormat === DetectedFormat.UNKNOWN) {
            setError(`Invalid format. Please ensure the content is valid ${supportedFormats.join(" or ")}.`);
        }
    }, [type, detectedFormat, importTypeName, supportedFormats]);

    // Auto-detect format based on content
    const detectFormat = (value: string): DetectedFormat => {
        if (!value || value.trim() === "") {
            return DetectedFormat.EMPTY;
        }

        const trimmed = value.trim();

        // Try to detect JSON
        if (supportedFormats.includes(DetectedFormat.JSON)) {
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    JSON.parse(trimmed);
                    setError("");
                    return DetectedFormat.JSON;
                } catch (e) {
                    // Not valid JSON, continue checking
                    setError("Invalid JSON format");
                }
            }
        }

        // Try to detect XML
        if (supportedFormats.includes(DetectedFormat.XML)) {
            if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(trimmed, "text/xml");
                    // Check if parsing produced an error node
                    if (doc.getElementsByTagName("parsererror").length === 0) {
                        setError("");
                        return DetectedFormat.XML;
                    }
                } catch (e) {
                    // Not valid XML
                    setError("Invalid XML format");
                }
            }
        }
        
        return DetectedFormat.UNKNOWN;
    };

    const validateTypeName = useCallback(debounce(async (value: string) => {
        const projectPath = await rpcClient.getVisualizerLocation().then((res) => res.projectPath);

        const endPosition = await rpcClient.getBIDiagramRpcClient().getEndOfFile({
            filePath: Utils.joinPath(URI.file(projectPath), 'types.bal').fsPath
        });

        const response = await rpcClient.getBIDiagramRpcClient().getExpressionDiagnostics({
            filePath: type?.codedata?.lineRange?.fileName || "types.bal",
            context: {
                expression: value,
                startLine: {
                    line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                    offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                },
                offset: 0,
                lineOffset: 0,
                codedata: {
                    node: "VARIABLE",
                    lineRange: {
                        startLine: {
                            line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                            offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                        },
                        endLine: {
                            line: type?.codedata?.lineRange?.endLine?.line ?? endPosition.line,
                            offset: type?.codedata?.lineRange?.endLine?.offset ?? endPosition.offset
                        },
                        fileName: type?.codedata?.lineRange?.fileName
                    },
                },
                property: type?.properties["name"] ?
                    {
                        ...type.properties["name"],
                        types: [{ fieldType:  type.properties["name"].valueType, scope: "Global", selected: false}]
                    } :
                    {
                        metadata: {
                            label: "",
                            description: "",
                        },
                        value: "",
                        types: [{fieldType: "IDENTIFIER", scope: "Global", selected: false}],
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
    }, 250), [rpcClient, type]);

    const handleOnBlur = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await validateTypeName(e.target.value);
    };

    const handleNameChange = async (value: string) => {
        setImportTypeName(value);
        await validateTypeName(value);
    };

    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = event.target.value;
        setContent(newContent);

        // Detect format
        const format = detectFormat(newContent);
        setDetectedFormat(format);
    };

    const handleFileUpload = (fileContent: string) => {
        setContent(fileContent);

        // Auto-detect format from uploaded file content
        const format = detectFormat(fileContent);
        setDetectedFormat(format);
    };

    const importAsJson = async () => {
        setIsSaving(true);
        setError("");

        try {
            const typesFromJson: JsonToTypeResponse = await rpcClient.getBIDiagramRpcClient().getTypeFromJson({
                jsonString: content,
                typeName: importTypeName
            });

            // Since the LS issue where all types are created with first letter capital we cant carry exact string match.
            // Therefore we are considering the last type to be the main records, and the rest are dependencies.
            const record = typesFromJson.types[typesFromJson.types.length - 1];
            const otherRecords = typesFromJson.types
                .slice(0, -1)
                .map((t) => t.type);

            if (otherRecords.length > 0) {
                await rpcClient.getBIDiagramRpcClient().updateTypes({
                    filePath: 'types.bal',
                    types: otherRecords
                });

                if (!isPopupTypeForm) {
                    await rpcClient.getVisualizerRpcClient().openView(
                        { type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { addType: false } }
                    );
                }
            }

            if (record) {
                await onTypeSave(record.type);
            }
        } catch (err) {
            setError("Could not import JSON as type.");
            console.error("Error importing JSON as type:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const importAsXml = async () => {
        setIsSaving(true);
        setError("");

        try {
            const resp: TypeDataWithReferences = await rpcClient.getRecordCreatorRpcClient().convertXmlToRecordType({
                xmlValue: content,
                prefix: ""
            });

            const lastRecord = resp.types[resp.types.length - 1];
            const otherRecords = resp.types
                .filter((t) => t.type.name !== lastRecord.type.name)
                .map((t) => t.type);

            if (otherRecords.length > 0) {
                await rpcClient.getBIDiagramRpcClient().updateTypes({
                    filePath: 'types.bal',
                    types: otherRecords
                });

                if (!isPopupTypeForm) {
                    await rpcClient.getVisualizerRpcClient().openView(
                        { type: EVENT_TYPE.UPDATE_PROJECT_LOCATION, location: { addType: false } }
                    );
                }
            }

            if (lastRecord) {
                await onTypeSave(lastRecord.type);
            }
        } catch (err) {
            setError("Failed to import XML as type.");
            console.error("Error importing XML as type:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImport = async () => {
        if (detectedFormat === DetectedFormat.JSON) {
            await importAsJson();
        } else if (detectedFormat === DetectedFormat.XML) {
            await importAsXml();
        }
    };

    const isImportDisabled = () => {
        if (!content.trim()) return true;
        if (detectedFormat === DetectedFormat.UNKNOWN) return true;
        if (detectedFormat === DetectedFormat.JSON && (!importTypeName.trim() || !isTypeNameValid)) return true;
        if (isSaving) return true;
        return false;
    };

    // Create a hidden file input ref for the upload button
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            handleFileUpload(content);
        };
        reader.readAsText(file);
    };

    const generateSampleJson = async () => {
        if (!payloadContext) {
            console.error("No payload context available for JSON generation");
            return;
        }

        try {
            // Set loading state for generation
            setIsGenerating(true);
            setError("");

            console.log("Generating sample JSON with context:", payloadContext);
            let generatedJson: string;
            try {
                const generatedJsonObj = await rpcClient.getServiceDesignerRpcClient().generateExamplePayloadJson(payloadContext);

                // // Populate the textarea with the generated JSON
                generatedJson = JSON.stringify(generatedJsonObj, null, 2);
            } catch (error) {
                console.error("Error during AI Example JSON generation:", error);

                // Use fallback mock data
                const mockGeneratedJson = {
                    id: 1,
                    name: "Sample User",
                    email: "user@example.com",
                    age: 25,
                };
                generatedJson = JSON.stringify(mockGeneratedJson, null, 2);
            }

            setContent(generatedJson);

            // Auto-detect format for the generated content
            const format = detectFormat(generatedJson);
            setDetectedFormat(format);

            console.log("Generated JSON:", generatedJson);

        } catch (err) {
            console.error("Error generating sample JSON:", err);
            setError("Failed to generate sample JSON. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const selectJsonType = () => {
        const jsonType: Type = {
            name: "json",
            editable: false,
            metadata: {
                label: "json",
                description: "",
            },
            codedata: {
                node: "TYPEDESC"
            },
            properties: {},
            members: [],
            includes: []
        };


        onTypeSelect(jsonType);
    };

    return (
        <StickyFooterContainer>
            <ContentBody>
                <InfoBanner>
                    <Codicon name="info" />
                    <InfoText variant="body3">
                        Supports {supportedFormats.join(" and ")} format{supportedFormats.length > 1 ? "s" : ""} — just paste a Sample or Upload a file 
                    </InfoText>
                </InfoBanner>
                <HeaderRow>
                    <Title variant="h4" sx={{ margin: '0px' }}>Sample data</Title>
                    <UploadButtonWrapper>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept={supportedFormats.map(format => `.${format.toLowerCase()}`).join(",")}
                            style={{ display: 'none' }}
                        />
                        <LinkButton
                            onClick={handleUploadClick}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--vscode-textLink-foreground)',
                                color: 'var(--vscode-textLink-foreground)',
                                padding: '6px 12px',
                                fontSize: '13px'
                            }}
                        >
                            <Icon
                                name="bi-import"
                                iconSx={{ fontSize: "15px" }}
                                sx={{ marginRight: "5px" }}
                            />
                            <Typography variant="body3">
                                Upload File
                            </Typography>
                        </LinkButton>
                    </UploadButtonWrapper>
                </HeaderRow>


                <div style={{ position: 'relative' }}>
                    <TextArea
                        rows={15}
                        value={content}
                        onChange={handleContentChange}
                        errorMsg={error}
                        placeholder=""
                    />
                    {/* Loading overlay for generation */}
                    {isGenerating && (
                        <LoaderOverlay>
                            <ProgressRing />
                            <Typography variant="body3" sx={{ color: 'var(--vscode-foreground)' }}>
                                Generating sample JSON...
                            </Typography>
                        </LoaderOverlay>
                    )}
                    {!content && !isGenerating && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}>
                            <Typography
                                variant="body3"
                                sx={{ color: 'var(--vscode-input-placeholderForeground)', textAlign: 'center' }}
                            >
                                Paste {supportedFormats.join(" or ")} here...
                            </Typography>
                            {payloadContext?.protocol !== Protocol.FTP && (<Typography
                                variant="body3"
                                sx={{ color: 'var(--vscode-input-placeholderForeground)', textAlign: 'center' }}
                            >
                                or
                            </Typography>)}
                            {payloadContext && isUserAuthenticated && (
                                <>
                                    <LinkButton
                                        onClick={() => generateSampleJson()}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            backgroundColor: 'transparent',
                                            color: 'var(--vscode-textLink-foreground)',
                                            padding: '8px 16px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        <Codicon name="wand" sx={{ fontSize: '14px' }} />
                                        Generate Sample JSON
                                    </LinkButton>
                                    <Typography
                                        variant="body3"
                                        sx={{ color: 'var(--vscode-input-placeholderForeground)', textAlign: 'center' }}
                                    >
                                        or
                                    </Typography>
                                </>
                            )}
                            {payloadContext?.protocol!==Protocol.FTP && (<LinkButton
                                onClick={() => selectJsonType()}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--vscode-textLink-foreground)',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    borderRadius: '4px',
                                    pointerEvents: 'auto'
                                }}
                            >
                                Continue with JSON Type
                            </LinkButton>)}
                        </div>
                    )}
                </div>

                {detectedFormat === DetectedFormat.JSON && (
                    <CategoryRow showBorder={false}>
                        <TextFieldWrapper>
                            <TextField
                                label="Type Name"
                                value={importTypeName}
                                errorMsg={nameError}
                                onBlur={handleOnBlur}
                                onChange={(e) => handleNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleNameChange((e.target as HTMLInputElement).value);
                                    }
                                }}
                                onFocus={(e) => {
                                    e.target.select();
                                    validateTypeName(e.target.value);
                                }}
                                ref={nameInputRef}
                            />
                        </TextFieldWrapper>
                    </CategoryRow>
                )}
            </ContentBody>
            <FloatingFooter>
                <Button onClick={handleImport} disabled={isImportDisabled()}>
                    {isSaving ? <Typography variant="progress">Importing...</Typography> : "Import Type"}
                </Button>
            </FloatingFooter>
        </StickyFooterContainer>
    );
}
