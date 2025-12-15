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

import { Icon, ThemeColors, Typography, View, ViewContent } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { useEffect, useState } from "react";
import { TitleBar } from "../../../components/TitleBar";
import { isBetaModule } from "../ComponentListView/componentListUtils";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormField, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { EVENT_TYPE, getPrimaryInputType, LineRange, Property, PropertyModel, RecordTypeField, ServiceInitModel } from "@wso2/ballerina-core";
import { FormHeader } from "../../../components/FormHeader";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import styled from "@emotion/styled";
import { getImportsForProperty } from "../../../utils/bi";
import { DownloadIcon } from "../../../components/DownloadIcon";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { sanitizedHttpPath, normalizeValueToArray } from "./utils";

const Container = styled.div`
    display: flex;
    flex-direction: column;
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
    padding-bottom: 100px;
`;

const StatusContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const StatusCard = styled.div`
    margin: 16px 16px 0 16px;
    padding: 16px;
    border-radius: 8px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;

    & > svg {
        font-size: 24px;
        color: ${ThemeColors.ON_SURFACE};
    }
`;

const StatusText = styled(Typography)`
    color: ${ThemeColors.ON_SURFACE};
`;


export interface ServiceCreationViewProps {
    projectPath: string;
    orgName: string;
    packageName: string;
    moduleName: string;
    version?: string;
}

interface HeaderInfo {
    title: string;
    moduleName: string;
}

enum PullingStatus {
    FETCHING = "fetching",
    PULLING = "pulling",
    SUCCESS = "success",
    ERROR = "error",
}

/**
 * Maps the properties to an array of FormField objects.
 * 
 * @param properties The properties to map.
 * @returns An array of FormField objects.
 */
function mapPropertiesToFormFields(properties: { [key: string]: PropertyModel; }): FormField[] {
    if (!properties) return [];

    return Object.entries(properties).map(([key, property]) => {

        // Determine value for MULTIPLE_SELECT
        let value: any = property.value;
        if (getPrimaryInputType(property.types)?.fieldType === "MULTIPLE_SELECT") {
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

        let items = undefined;
        if (getPrimaryInputType(property.types)?.fieldType === "MULTIPLE_SELECT" || getPrimaryInputType(property.types)?.fieldType === "SINGLE_SELECT") {
            items = property.items;
        }

        return {
            key,
            label: property?.metadata?.label,
            type: getPrimaryInputType(property.types)?.fieldType,
            documentation: property?.metadata?.description || "",
            valueType: getPrimaryInputType(property.types)?.ballerinaType,
            editable: true,
            enabled: property.enabled ?? true,
            optional: property.optional,
            value,
            types: property.types,
            advanced: property.advanced,
            diagnostics: [],
            items,
            choices: property.choices,
            placeholder: property.placeholder,
            addNewButton: property.addNewButton,
            lineRange: property?.codedata?.lineRange,
            advanceProps: mapPropertiesToFormFields(property.properties)
        } as FormField;
    });
}

/**
 * Populate the ServiceInitModel from the form fields.
 * 
 * @param formFields The form fields to update.
 * @param model The ServiceInitModel to update.
 * @returns The updated ServiceInitModel.
 */
function populateServiceInitModelFromFormFields(formFields: FormField[], model: ServiceInitModel): ServiceInitModel {
    if (!model || !model.properties || !formFields) return model;

    formFields.forEach(field => {
        const property = model.properties[field.key];
        if (!property) return;

        const value = field.value;

        // Handle MULTIPLE_SELECT and EXPRESSION_SET types
        if (field.type === "MULTIPLE_SELECT" || field.type === "EXPRESSION_SET") {
            property.values = normalizeValueToArray(value);
        } else {
            property.value = value as string;
        }
    });
    return model;
}

export function ServiceCreationView(props: ServiceCreationViewProps) {

    const { projectPath, orgName, packageName, moduleName } = props;
    const { rpcClient } = useRpcContext();

    const [headerInfo, setHeaderInfo] = useState<HeaderInfo>(null);
    const [model, setServiceInitModel] = useState<ServiceInitModel>(null);
    const [formFields, setFormFields] = useState<FormField[]>([]);

    const [pullingStatus, setPullingStatus] = useState<PullingStatus>(PullingStatus.FETCHING);
    const [filePath, setFilePath] = useState<string>("");
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);

    const MAIN_BALLERINA_FILE = "main.bal";

    useEffect(() => {
        const fetchData = async () => {
            setPullingStatus(PullingStatus.FETCHING);

            const promise = rpcClient
                .getServiceDesignerRpcClient()
                .getServiceInitModel({
                    filePath: "", orgName: orgName, pkgName: packageName, moduleName: moduleName, listenerName: ""
                });

            let timer: ReturnType<typeof setTimeout> | null = null;
            let didTimeout = false;
            let res;

            // Wait for up to 3 seconds for a fast response
            const timeoutPromise = new Promise<void>((resolve) => {
                timer = setTimeout(() => {
                    didTimeout = true;
                    setPullingStatus(PullingStatus.PULLING);
                    resolve();
                }, 3000);
            });

            res = await Promise.race([
                promise.then((result) => {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    return result;
                }),
                timeoutPromise.then(() => promise)
            ]);

            // If the response arrived before the timer, package is present, load form immediately
            if (!didTimeout && res?.serviceInitModel) {
                setHeaderInfo({
                    title: res.serviceInitModel.displayName,
                    moduleName: res.serviceInitModel.moduleName
                });
                setServiceInitModel(res.serviceInitModel);
                setFormFields(mapPropertiesToFormFields(res.serviceInitModel.properties));
                setPullingStatus(undefined);
            } else if (didTimeout && res?.serviceInitModel) {
                // If timer expired, show pulling status then load form
                setPullingStatus(PullingStatus.SUCCESS);
                setHeaderInfo({
                    title: res.serviceInitModel.displayName,
                    moduleName: res.serviceInitModel.moduleName
                });
                setServiceInitModel(res.serviceInitModel);
                setFormFields(mapPropertiesToFormFields(res.serviceInitModel.properties));
                setPullingStatus(undefined);
            }

            rpcClient
                .getVisualizerRpcClient()
                .joinProjectPath({ segments: [MAIN_BALLERINA_FILE] })
                .then((response) => {
                    setFilePath(response.filePath);
                });
        };

        fetchData();
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

    useEffect(() => {
        if (model) {
            const hasPropertiesWithChoices = model?.moduleName === "http" &&
                Object.values(model.properties).some(property => property.choices);

            if (hasPropertiesWithChoices) {
                const choiceRecordTypeFields = Object.entries(model.properties)
                    .filter(([_, property]) => property.choices)
                    .flatMap(([parentKey, property]) =>
                        Object.entries(property.choices).flatMap(([choiceKey, choice]) =>
                            Object.entries(choice.properties || {})
                                .filter(([_, choiceProperty]) =>
                                    getPrimaryInputType(choiceProperty.types)?.typeMembers &&
                                    getPrimaryInputType(choiceProperty.types)?.typeMembers.some(member => member.kind === "RECORD_TYPE")
                                )
                                .map(([choicePropertyKey, choiceProperty]) => ({
                                    key: choicePropertyKey,
                                    property: {
                                        ...choiceProperty,
                                        metadata: {
                                            label: choiceProperty.metadata?.label || choicePropertyKey,
                                            description: choiceProperty.metadata?.description || ''
                                        },
                                        types: choiceProperty.types,
                                        diagnostics: {
                                            hasDiagnostics: choiceProperty.diagnostics && choiceProperty.diagnostics.length > 0,
                                            diagnostics: choiceProperty.diagnostics
                                        }
                                    } as Property,
                                    recordTypeMembers: getPrimaryInputType(choiceProperty.types)?.typeMembers.filter(member => member.kind === "RECORD_TYPE")
                                }))
                        )
                    );
                console.log(">>> recordTypeFields of http serviceModel", choiceRecordTypeFields);

                setRecordTypeFields(choiceRecordTypeFields);
            } else {
                const recordTypeFields: RecordTypeField[] = Object.entries(model.properties)
                    .filter(([_, property]) =>
                        getPrimaryInputType(property.types)?.typeMembers &&
                        getPrimaryInputType(property.types)?.typeMembers.some(member => member.kind === "RECORD_TYPE")
                    )
                    .map(([key, property]) => ({
                        key,
                        property: {
                            ...property,
                            metadata: {
                                label: property.metadata?.label || key,
                                description: property.metadata?.description || ''
                            },
                            types: property.types,
                            diagnostics: {
                                hasDiagnostics: property.diagnostics && property.diagnostics.length > 0,
                                diagnostics: property.diagnostics
                            }
                        } as Property,
                        recordTypeMembers: getPrimaryInputType(property.types)?.typeMembers.filter(member => member.kind === "RECORD_TYPE")
                    }));
                console.log(">>> recordTypeFields of serviceModel", recordTypeFields);

                setRecordTypeFields(recordTypeFields);
            }
        }
    }, [model]);

    /**
     * Recursively processes a property and its nested CHOICE fields
     *
     * @param property The property to process
     * @param data The form data containing all field values
     */
    const processPropertyRecursively = (property: PropertyModel, data: FormValues): void => {
        // If this property is a CHOICE field, process it
        if (getPrimaryInputType(property.types)?.fieldType === "CHOICE" && property.choices) {
            property.choices.forEach((choice, index) => {
                // Disable all choices first
                choice.enabled = false;

                // The property.value should contain the selected index
                if (property.value !== undefined && Number(property.value) === index) {
                    choice.enabled = true;

                    // Process all properties in this selected choice
                    if (choice.properties) {
                        for (const nestedKey in choice.properties) {
                            const nestedProperty = choice.properties[nestedKey];

                            // Set value from form data if available
                            if (data[nestedKey] !== undefined) {
                                // Handle MULTIPLE_SELECT and EXPRESSION_SET types
                                if (getPrimaryInputType(nestedProperty.types)?.fieldType === "MULTIPLE_SELECT" || getPrimaryInputType(nestedProperty.types)?.fieldType === "EXPRESSION_SET") {
                                    const value = data[nestedKey];
                                    nestedProperty.values = normalizeValueToArray(value);
                                } else {
                                    nestedProperty.value = data[nestedKey] as string;
                                }
                            }

                            // Recursively process this nested property
                            processPropertyRecursively(nestedProperty, data);
                        }
                    }
                }
            });
        }
        // If this property has nested properties (like CONDITIONAL_FIELDS), process them
        else if (property.properties) {
            for (const nestedKey in property.properties) {
                const nestedProperty = property.properties[nestedKey];

                // Set value from form data if available
                if (data[nestedKey] !== undefined) {
                    if (getPrimaryInputType(nestedProperty.types)?.fieldType === "MULTIPLE_SELECT" || getPrimaryInputType(nestedProperty.types)?.fieldType === "EXPRESSION_SET") {
                        const value = data[nestedKey];
                        nestedProperty.values = normalizeValueToArray(value);
                    } else {
                        nestedProperty.value = data[nestedKey] as string;
                    }
                }

                // Recursively process nested properties
                processPropertyRecursively(nestedProperty, data);
            }
        }
    };

    const handleOnSubmit = async (data: FormValues, formImports: FormImports) => {
        setIsSaving(true);
        formFields.forEach(val => {
            if (val.type === "CHOICE") {
                val.choices.forEach((choice, index) => {
                    choice.enabled = false;
                    if (data[val.key] === index) {
                        choice.enabled = true;
                        if (choice.properties) {
                            for (const key in choice.properties) {
                                const property = choice.properties[key];
                                if (data[key] !== undefined) {
                                    if (key === "basePath") {
                                        property.value = sanitizedHttpPath(data[key]);
                                    } else {
                                        property.value = data[key];
                                    }
                                }
                                processPropertyRecursively(property, data);
                            }
                        }
                    }
                })
            } else if (data[val.key] !== undefined) {
                val.value = data[val.key];
            }

            if (val.type === "CONDITIONAL_FIELDS") {
                val.advanceProps.forEach(subField => {
                    const subProperty = model.properties[val.key]?.properties?.[subField.key];
                    if (subProperty) {
                        if (data[subField.key] !== undefined) {
                            subProperty.value = data[subField.key];
                        }
                        processPropertyRecursively(subProperty, data);
                    }
                });
            }

            val.imports = getImportsForProperty(val.key, formImports);
        })
        const updatedModel = populateServiceInitModelFromFormFields(formFields, model);

        const res = await rpcClient
            .getServiceDesignerRpcClient()
            .createServiceAndListener({ filePath: "", serviceInitModel: updatedModel });


        const newArtifact = res.artifacts.find(res => res.isNew && model.moduleName === res.moduleName);
        if (newArtifact) {
            rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: newArtifact.path, position: newArtifact.position } });
            setIsSaving(false);
            return;
        }
    }

    return (
        <View>
            {pullingStatus && (
                <StatusContainer>
                    {pullingStatus === PullingStatus.FETCHING && (
                        <RelativeLoader message="Loading package..." />
                    )}
                    {pullingStatus === PullingStatus.PULLING && (
                        <StatusCard>
                            <DownloadIcon color={ThemeColors.ON_SURFACE} />
                            <StatusText variant="body2">
                                Please wait while the {packageName} package is being pulled...
                            </StatusText>
                        </StatusCard>
                    )}
                    {pullingStatus === PullingStatus.SUCCESS && (
                        <StatusCard>
                            <Icon name="bi-success" sx={{ color: ThemeColors.PRIMARY, fontSize: "18px" }} />
                            <StatusText variant="body2">Package pulled successfully.</StatusText>
                        </StatusCard>
                    )}
                    {pullingStatus === PullingStatus.ERROR && (
                        <StatusCard>
                            <Icon name="bi-error" sx={{ color: ThemeColors.ERROR, fontSize: "18px" }} />
                            <StatusText variant="body2">
                                Failed to pull the package. Please try again.
                            </StatusText>
                        </StatusCard>
                    )}
                </StatusContainer>
            )}

            {!pullingStatus && (
                <>
                    <TopNavigationBar projectPath={projectPath} />
                    {headerInfo && (
                        <TitleBar
                            title={headerInfo.title}
                            isBetaFeature={isBetaModule(headerInfo.moduleName)}
                            subtitle={model.description}
                        />
                    )}
                    <ViewContent>
                        <Container>
                            <>
                                {formFields && formFields.length > 0 && (
                                    <FormContainer>
                                        <FormHeader title={`Create ${model.displayName}`} />
                                        {filePath && targetLineRange && (
                                            <FormGeneratorNew
                                                fileName={filePath}
                                                targetLineRange={targetLineRange}
                                                fields={formFields}
                                                isSaving={isSaving}
                                                nestedForm={true}
                                                onSubmit={handleOnSubmit}
                                                preserveFieldOrder={true}
                                                recordTypeFields={recordTypeFields}
                                                submitText="Create"
                                            />
                                        )}
                                    </FormContainer>
                                )}
                            </>
                        </Container>
                    </ViewContent>
                </>
            )}
        </View>
    );
}
