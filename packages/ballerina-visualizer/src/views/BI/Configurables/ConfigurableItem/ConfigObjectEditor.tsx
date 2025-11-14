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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { VSCodeTextField, VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { GetRecordConfigRequest, Property, TypeField, RecordSourceGenRequest, RecordSourceGenResponse } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Codicon, Tooltip, Typography } from "@wso2/ui-toolkit";

const EditorContainer = styled.div`
    width: 100%;
    font-size: 13px;
`;

const FieldRow = styled.div<{ level: number }>`
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
    padding-left: ${(props: { level: number }) => props.level * 16}px;
`;

const FieldHeader = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    cursor: pointer;
    user-select: none;
`;

const FieldLabel = styled.span`
    color: var(--vscode-settings-headerForeground);
    font-weight: 500;
    margin-right: 8px;
    font-size: 13px;
`;

const FieldType = styled.span`
    font-size: 13px;
    margin-left: 4px;
`;

const OptionalLabel = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-left: 4px;
`;

const RequiredLabel = styled.span`
    color: var(--vscode-editorWarning-foreground);
    font-size: 12px;
    margin-left: 4px;
`;

const DefaultableLabel = styled.span`
    font-size: 12px;
    margin-left: 4px;
`;

const DocumentationText = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    margin-top: 2px;
    margin-bottom: 6px;
    line-height: 1.4;
`;

const ExpandIcon = styled(Codicon) <{ expanded: boolean }>`
    margin-right: 4px;
    transition: transform 0.2s;
    transform: ${(props: { expanded: boolean }) => props.expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
`;

const NestedFieldsContainer = styled.div`
    margin-left: 16px;
    border-left: 1px solid var(--vscode-panel-border);
    padding-left: 8px;
    margin-top: 8px;
`;

const ArrayContainer = styled.div`
    margin-top: 8px;
`;

const ArrayItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
`;

const ArrayControls = styled.div`
    display: flex;
    gap: 4px;
    margin-top: 4px;
`;

const AddButton = styled(VSCodeButton)`
    font-size: 12px;
`;

const RemoveButton = styled(VSCodeButton)`
    font-size: 12px;
    min-width: 24px;
`;

interface ObjectEditorProps {
    fileName: string;
    configValue: string | object;
    typeValue: Property;
    onChange: (value: string) => void;
}

interface TypeFieldRendererProps {
    field: TypeField;
    level: number;
    onFieldChange: (field: TypeField, newValue: any) => void;
}

function TypeFieldRenderer(props: TypeFieldRendererProps) {
    const { field, level, onFieldChange } = props;
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [fieldValue, setFieldValue] = useState<string>(field.value !== undefined && field.value !== null ? String(field.value) : '');
    const [boolValue, setBoolValue] = useState<boolean>(field.value === true || field.value === 'true');
    const [arrayItems, setArrayItems] = useState<any[]>([]);

    // Check field type
    const isArrayType = field.typeName === 'array' || field.typeName?.endsWith('[]');
    const isBooleanType = field.typeName === 'boolean';
    const isNumericType = field.typeName === 'int' || field.typeName === 'float' || field.typeName === 'decimal';
    const isStringType = field.typeName === 'string';

    // Update field value when the field prop changes
    useEffect(() => {
        if (isBooleanType) {
            setBoolValue(field.value === true || field.value === 'true');
        } else if (isStringType && field.value !== undefined && field.value !== null) {
            setFieldValue(field.value.replace(/^"|"$/g, ''));
        } else if (isArrayType && field.value !== undefined && field.value !== null) {
            // Parse array value
            try {
                let parsedArray;
                if (typeof field.value === 'string') {
                    parsedArray = JSON.parse(field.value);
                } else if (Array.isArray(field.value)) {
                    parsedArray = field.value;
                } else {
                    parsedArray = [];
                }
                setArrayItems(parsedArray);
            } catch (e) {
                setArrayItems([]);
            }
        } else if (isArrayType) {
            // Array type with no value (null/undefined)
            setArrayItems([]);
        } else {
            setFieldValue(field.value !== undefined && field.value !== null ? String(field.value) : '');
        }
    }, [field.value, isArrayType, isBooleanType, isStringType]);

    // Initialize empty array if no value exists
    useEffect(() => {
        if (isArrayType && arrayItems.length === 0 && field.value === undefined) {
            setArrayItems([]);
        }
    }, [isArrayType, field.value]);

    const hasNestedFields = field.fields && field.fields.length > 0;
    const isRecordType = field.typeName === 'record';

    const handleValueChange = (e: any) => {
        let newValue = e.target.value;
        setFieldValue(newValue);

        // If the field type is string, wrap the value with quotes when updating
        if (isStringType) {
            // Add quotes only if not already present
            if (!/^".*"$/.test(newValue)) {
                newValue = `"${newValue}"`;
            }
        } else if (isNumericType) {
            // For numeric types, don't wrap with quotes
            newValue = newValue;
        }
        field.value = newValue;
        onFieldChange(field, newValue);
    };

    const handleBooleanChange = (e: any) => {
        const newValue = e.target.checked;
        setBoolValue(newValue);
        field.value = newValue;
        onFieldChange(field, newValue);
    };

    const handleNumericChange = (e: any) => {
        const value = e.target.value;
        // Only allow numeric input
        if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
            setFieldValue(value);
            field.value = value;
            onFieldChange(field, value);
        }
    };

    const handleArrayItemChange = (index: number, value: any) => {
        const newArrayItems = [...arrayItems];

        // Handle based on member type
        const memberTypeName = field.memberType?.typeName;
        if (memberTypeName === 'string') {
            // For strings, wrap in quotes if not already wrapped
            newArrayItems[index] = value;
        } else if (memberTypeName === 'boolean') {
            newArrayItems[index] = value;
        } else if (memberTypeName === 'int' || memberTypeName === 'float' || memberTypeName === 'decimal') {
            newArrayItems[index] = value;
        } else {
            newArrayItems[index] = value;
        }

        setArrayItems(newArrayItems);

        // Update the field with the new array value
        // If all items are empty, set to empty array []
        const filteredItems = newArrayItems.filter(item => item !== '');
        const arrayValue = filteredItems.length > 0 ? JSON.stringify(newArrayItems) : '[]';
        field.value = arrayValue;
        onFieldChange(field, arrayValue);
    };

    const addArrayItem = () => {
        // Determine default value based on member type
        const memberTypeName = field.memberType?.typeName;
        let defaultValue: any = '';

        if (memberTypeName === 'boolean') {
            defaultValue = false;
        } else if (memberTypeName === 'int' || memberTypeName === 'float' || memberTypeName === 'decimal') {
            defaultValue = '';
        } else if (memberTypeName === 'string') {
            defaultValue = '';
        }

        const newArrayItems = [...arrayItems, defaultValue];
        setArrayItems(newArrayItems);

        // Update field value and trigger change
        field.value = JSON.stringify(newArrayItems);
        onFieldChange(field, JSON.stringify(newArrayItems));
    };

    const removeArrayItem = (index: number) => {
        const newArrayItems = arrayItems.filter((_, i) => i !== index);
        setArrayItems(newArrayItems);

        // If no items left, set value to empty array []
        if (newArrayItems.length === 0) {
            field.value = '[]';
            onFieldChange(field, '[]');
        } else {
            const arrayValue = JSON.stringify(newArrayItems);
            field.value = arrayValue;
            onFieldChange(field, arrayValue);
        }
    };

    const toggleExpand = () => {
        if (hasNestedFields || isArrayType) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <FieldRow level={level}>
            <FieldHeader onClick={isBooleanType ? undefined : toggleExpand} style={{ cursor: isBooleanType ? 'default' : 'pointer' }}>
                {(hasNestedFields || isArrayType) && (
                    <ExpandIcon
                        name="chevron-right"
                        expanded={isExpanded}
                    />
                )}
                <FieldLabel>{field.name || field.displayName}</FieldLabel>
                {field.typeName && (
                    <FieldType>{field.typeName}</FieldType>
                )}
                {field.optional && (
                    <OptionalLabel>(Optional)</OptionalLabel>
                )}
                {!field.optional && !field.defaultable && field.typeName !== "record" && (field.value === undefined || field.value === null || field.value === '' || field.value === '[]') && (
                    <RequiredLabel>(Required)</RequiredLabel>
                )}
                {field.defaultable && (
                    <DefaultableLabel>(Has Default)</DefaultableLabel>
                )}
            </FieldHeader>

            {/* Show documentation below header */}
            {field.documentation && (
                <DocumentationText>
                    {field.documentation}
                </DocumentationText>
            )}

            {/* Array type rendering */}
            {isArrayType && isExpanded && (
                <ArrayContainer>
                    {arrayItems.length === 0 ? (
                        <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)', marginBottom: '8px' }}>
                            No items ([])
                        </Typography>
                    ) : (
                        arrayItems.map((item, index) => {
                            const memberTypeName = field.memberType?.typeName;
                            return (
                                <ArrayItem key={index}>
                                    {memberTypeName === 'boolean' ? (
                                        <VSCodeCheckbox
                                            checked={item === true || item === 'true'}
                                            onChange={(e: any) => handleArrayItemChange(index, e.target.checked)}
                                        >
                                            Item {index + 1}
                                        </VSCodeCheckbox>
                                    ) : memberTypeName === 'int' || memberTypeName === 'float' || memberTypeName === 'decimal' ? (
                                        <VSCodeTextField
                                            value={typeof item === 'string' ? item : String(item)}
                                            style={{ flex: 1, maxWidth: '350px' }}
                                            onChange={(e: any) => {
                                                const value = e.target.value;
                                                if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                                                    handleArrayItemChange(index, value);
                                                }
                                            }}
                                            placeholder={`Item ${index + 1} (${memberTypeName})`}
                                        />
                                    ) : (
                                        <VSCodeTextField
                                            value={typeof item === 'string' ? item : JSON.stringify(item)}
                                            style={{ flex: 1, maxWidth: '350px' }}
                                            onChange={(e: any) => handleArrayItemChange(index, e.target.value)}
                                            placeholder={`Item ${index + 1}${memberTypeName ? ` (${memberTypeName})` : ''}`}
                                        />
                                    )}
                                    <RemoveButton
                                        appearance="icon"
                                        onClick={() => removeArrayItem(index)}
                                        title="Remove item"
                                    >
                                        <Codicon name="trash" />
                                    </RemoveButton>
                                </ArrayItem>
                            );
                        })
                    )}
                    <ArrayControls>
                        <AddButton
                            appearance="secondary"
                            onClick={addArrayItem}
                        >
                            <Codicon name="add" sx={{ marginRight: '4px' }} />
                            Add Item
                        </AddButton>
                    </ArrayControls>
                </ArrayContainer>
            )}

            {/* Boolean field rendering */}
            {isBooleanType && (
                <VSCodeCheckbox
                    checked={boolValue}
                    onChange={handleBooleanChange}
                >
                    {boolValue ? 'Enabled' : 'Disabled'}
                </VSCodeCheckbox>
            )}

            {/* Numeric field rendering */}
            {isNumericType && !isArrayType && (
                <VSCodeTextField
                    value={fieldValue}
                    style={{ width: '100%', maxWidth: '400px' }}
                    onChange={handleNumericChange}
                    placeholder={field.defaultValue !== undefined ? `Default: ${field.defaultValue}` : 'Enter a number'}
                />
            )}

            {/* String field rendering */}
            {isStringType && !isArrayType && (
                <VSCodeTextField
                    value={fieldValue}
                    style={{ width: '100%', maxWidth: '400px' }}
                    onChange={handleValueChange}
                    placeholder={field.defaultValue !== undefined ? `Default: ${field.defaultValue}` : ''}
                />
            )}

            {/* Other types field rendering */}
            {!isBooleanType && !isNumericType && !isStringType && !isRecordType && !hasNestedFields && !isArrayType && (
                <VSCodeTextField
                    value={fieldValue}
                    style={{ width: '100%', maxWidth: '400px' }}
                    onChange={handleValueChange}
                    placeholder={field.defaultValue !== undefined ? `Default: ${field.defaultValue}` : ''}
                />
            )}

            {/* Nested fields rendering */}
            {hasNestedFields && isExpanded && !isArrayType && (
                <NestedFieldsContainer>
                    {field.fields.map((nestedField, index) => (
                        <TypeFieldRenderer
                            key={`${nestedField.name}-${index}`}
                            field={nestedField}
                            level={level + 1}
                            onFieldChange={onFieldChange}
                        />
                    ))}
                </NestedFieldsContainer>
            )}
        </FieldRow>
    );
}

export function ConfigObjectEditor(props: ObjectEditorProps) {
    const { fileName, configValue, typeValue, onChange } = props;

    const [recordConfig, setRecordConfig] = useState<TypeField | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const { rpcClient } = useRpcContext();

    useEffect(() => {
        loadRecordConfig();
    }, []);

    const loadRecordConfig = async () => {
        setIsLoading(true);
        setError('');
        try {
            console.log('>>> typeMembers', typeValue.typeMembers);
            const typeInfo = typeValue.typeMembers.find(m => typeValue.value.toString().includes(m.type));
            const parts = typeInfo.packageInfo.split(':');
            let orgName = '';
            let moduleName = '';
            let version = '';
            let packageName = '';
            if (parts.length === 3) {
                [orgName, moduleName, version] = parts;
                packageName = typeInfo.packageName;
            }
            const request: GetRecordConfigRequest = {
                filePath: fileName,
                codedata: {
                    org: orgName,
                    module: moduleName,
                    version: version,
                    packageName: packageName,
                },
                typeConstraint: typeValue.value as string,
            };
            const response = await rpcClient.getBIDiagramRpcClient().getRecordConfig(request);
            console.log('recordConfig', response);

            if (response.recordConfig) {
                const configWithName: TypeField = {
                    name: typeValue.value as string,
                    ...response.recordConfig
                };
                // Set all fields and nested fields' selected to true recursively
                function setAllValuesTrue(field: TypeField) {
                    field.selected = true;
                    if (field.fields && field.fields.length > 0) {
                        field.fields.forEach(setAllValuesTrue);
                    }
                }
                setAllValuesTrue(configWithName);

                // If there's an existing config value, parse it and merge with recordConfig
                if (configValue) {
                    try {
                        let parsedValue;
                        if (typeof configValue === 'string') {
                            // Attempt to fix JSON if it is JavaScript-style (unquoted keys)
                            const fixedJson = configValue.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                            parsedValue = JSON.parse(fixedJson);
                        } else {
                            parsedValue = configValue;
                        }
                        mergeValuesIntoConfig(configWithName, parsedValue);
                    } catch (e) {
                        console.error('Error parsing config value:', e);
                    }
                }

                setRecordConfig(configWithName);
            }
        } catch (err) {
            console.error('Error loading record config:', err);
            setError('Failed to load record configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const mergeValuesIntoConfig = (config: TypeField, values: any) => {
        if (config.fields && typeof values === 'object' && values !== null) {
            config.fields.forEach(field => {
                if (field.name && values[field.name] !== undefined) {
                    if (field.fields && field.fields.length > 0 && typeof values[field.name] === 'object') {
                        mergeValuesIntoConfig(field, values[field.name]);
                    } else {
                        field.value = values[field.name];
                    }
                }
            });
        }
    };

    const handleFieldChange = async (field: TypeField, newValue: any) => {
        // Update the field value in the recordConfig
        field.value = newValue;

        // Generate source code from the updated recordConfig
        if (recordConfig) {
            try {
                const request: RecordSourceGenRequest = {
                    filePath: fileName,
                    type: recordConfig
                };
                const response: RecordSourceGenResponse = await rpcClient.getBIDiagramRpcClient().getRecordSource(request);
                console.log('>>> recordSourceResponse', response);

                if (response.recordValue !== undefined) {
                    // Format the recordValue as a minified single line JSON-like string
                    if (response.recordValue && typeof response.recordValue === 'string') {
                        // Remove newlines and unnecessary whitespaces between tokens
                        const formattedValue = response.recordValue
                            .replace(/[\n\r]/g, '')      // remove newlines
                            .replace(/\s*([\{\}\[\]:,])\s*/g, '$1') // remove spaces around JSON tokens
                            .replace(/\s{2,}/g, '');    // remove multiple spaces
                        onChange(formattedValue);
                    } else {
                        onChange(response.recordValue);
                    }
                }
            } catch (err) {
                console.error('Error generating record source:', err);
            }
        }
    };

    if (isLoading) {
        return (
            <EditorContainer>
                <Typography variant="body3">Loading record configuration...</Typography>
            </EditorContainer>
        );
    }

    if (error) {
        return (
            <EditorContainer>
                <Typography variant="body3" sx={{ color: 'var(--vscode-errorForeground)' }}>
                    {error}
                </Typography>
            </EditorContainer>
        );
    }

    if (!recordConfig || !recordConfig.fields || recordConfig.fields.length === 0) {
        return (
            <EditorContainer>
                <Typography variant="body3">No record fields available</Typography>
            </EditorContainer>
        );
    }

    return (
        <EditorContainer>
            {/* Show the documentation of the record */}
            {recordConfig.documentation && (
                <DocumentationText>
                    {recordConfig.documentation}
                </DocumentationText>
            )}
            <div style={{ marginLeft: '16px', marginTop: '16px' }} >
                {recordConfig.fields.map((field, index) => (
                    <TypeFieldRenderer
                        key={`${field.name}-${index}`}
                        field={field}
                        level={0}
                        onFieldChange={handleFieldChange}
                    />
                ))}
            </div>
        </EditorContainer>
    );
};

export default ConfigObjectEditor;

