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
import React, { useEffect } from "react";
import {
    AutoComplete,
    Button,
    Codicon,
    LinkButton,
    SidePanel,
    SidePanelBody,
    SidePanelTitleContainer,
    TextField,
    ThemeColors
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { Controller, useForm } from 'react-hook-form';

import { useDMSubMappingConfigPanelStore, SubMappingConfigFormData } from "../../../../store/store";
import { View } from "../../Views/DataMapperView";

const Field = styled.div`
   display: flex;
   flex-direction: column;
   margin-bottom: 12px;
`;

const ALLOWED_TYPES = ['string', 'number', 'boolean', 'object'];
const ADD_NEW_SUB_MAPPING_HEADER = "Add New Sub Mapping";
const EDIT_SUB_MAPPING_HEADER = "Edit Sub Mapping";

export type SubMappingConfigFormProps = {
    views: View[];
    updateView: (updatedView: View) => void;
    applyModifications: (outputId: string, expression: string, viewId: string, name: string) => Promise<void>
};

export function SubMappingConfigForm(props: SubMappingConfigFormProps) {
    const { views, updateView, applyModifications } = props;
    const lastView = views && views[views.length - 1];

    const allowedTypes = [...ALLOWED_TYPES];

    const {
        subMappingConfig: { isSMConfigPanelOpen, nextSubMappingIndex, suggestedNextSubMappingName },
        resetSubMappingConfig,
        subMappingConfigFormData,
        setSubMappingConfigFormData
    } = useDMSubMappingConfigPanelStore(state => ({
        subMappingConfig: state.subMappingConfig,
        resetSubMappingConfig: state.resetSubMappingConfig,
        subMappingConfigFormData: state.subMappingConfigFormData,
        setSubMappingConfigFormData: state.setSubMappingConfigFormData
    })
    );

    let defaultValues: { mappingName: string; mappingType: string | null; isArray: boolean };
    if (subMappingConfigFormData) {
        defaultValues = {
            mappingName: subMappingConfigFormData.mappingName,
            mappingType: subMappingConfigFormData.mappingType,
            isArray: subMappingConfigFormData.isArray
        }
    } else {
        defaultValues = {
            mappingName: suggestedNextSubMappingName,
            mappingType: null,
            isArray: false
        }
    }

    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm<SubMappingConfigFormData>({ defaultValues });

    const isEdit = nextSubMappingIndex === -1 && !suggestedNextSubMappingName;

    const getIsArray = (mappingType: string) => {
        return mappingType.includes('[]');
    };

    const getBaseType = (mappingType: string) => {
        return mappingType.replaceAll('[]', '');
    };

    useEffect(() => {
        if (isEdit) {
            const { mappingName, mappingType } = lastView.subMappingInfo;
            setValue('mappingName', mappingName);
            setValue('mappingType', getBaseType(mappingType));
            setValue('isArray', getIsArray(mappingType));
        } else {
            setValue('mappingName', defaultValues.mappingName);
            setValue('mappingType', defaultValues.mappingType);
            setValue('isArray', defaultValues.isArray);
        }
    }, [isEdit, defaultValues.mappingName, defaultValues.mappingType, defaultValues.isArray, setValue]);

    const onAdd = async (data: SubMappingConfigFormData) => {
        // TODO: Implement onAdd
    };


    const onEdit = async (data: SubMappingConfigFormData) => {
        // TODO: Implement onEdit
        resetSubMappingConfig();
        reset();
    };

    const onClose = () => {
        resetSubMappingConfig();
    };

    const openImportCustomTypeForm = () => {
        setSubMappingConfigFormData(getValues());
    }

    return (
        <SidePanel
            isOpen={isSMConfigPanelOpen}
            alignment="right"
            sx={{
                fontFamily: "GilmerRegular",
                backgroundColor: ThemeColors.SURFACE_DIM,
                boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
            }}
            width={400}
            overlay={true}
        >
            <SidePanelTitleContainer>
                <span>{isEdit ? EDIT_SUB_MAPPING_HEADER : ADD_NEW_SUB_MAPPING_HEADER}</span>
                <Button
                    sx={{ marginLeft: "auto" }}
                    onClick={onClose}
                    appearance="icon"
                >
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                <Field>
                    <Controller
                        name="mappingName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Sub Mapping Name"
                                size={50}
                                placeholder={defaultValues.mappingName}
                            />
                        )}
                    />
                </Field>
                <Field>
                    <Controller
                        name="mappingType"
                        control={control}
                        render={({ field }) => (
                            <>
                                <AutoComplete
                                    label="Type (Optional)"
                                    name="mappingType"
                                    items={allowedTypes}
                                    nullable={true}
                                    value={field.value}
                                    onValueChange={(e) => { field.onChange(e); }}
                                    borderBox
                                />
                            </>
                        )}
                    />

                    <LinkButton
                        onClick={openImportCustomTypeForm}
                        sx={{ padding: "5px", gap: "2px", marginTop: "5px" }}
                    >
                        <Codicon
                            iconSx={{ fontSize: "12px" }}
                            name="add"
                        />
                        <p style={{ fontSize: "12px" }}>Add new type</p>
                    </LinkButton>

                </Field>
                <Field>
                    <Controller
                        name="isArray"
                        control={control}
                        render={({ field }) => (
                            <VSCodeCheckbox
                                checked={field.value}
                                onClick={(e: any) => field.onChange(e.target.checked)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                            >
                                Is Array
                            </VSCodeCheckbox>
                        )}
                    />
                </Field>
                {!isEdit && (
                    <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(onAdd)}
                            disabled={watch("mappingName") === ""}
                        >
                            Add
                        </Button>
                    </div>
                )}
                {isEdit && (
                    <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(onEdit)}
                            disabled={watch("mappingName") === ""}
                        >
                            Save
                        </Button>
                    </div>
                )}
            </SidePanelBody>
        </SidePanel>
    );
}
