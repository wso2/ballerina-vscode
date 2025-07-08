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
import React from "react";
import {
    Button,
    Codicon,
    SidePanel,
    SidePanelBody,
    SidePanelTitleContainer,
    ThemeColors
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { Controller, useForm } from 'react-hook-form';

import { useDMSubMappingConfigPanelStore, SubMappingConfigFormData } from "../../../../store/store";
import { View } from "../../Views/DataMapperView";

import { IDMFormField, IDMFormProps} from "@wso2/ballerina-core";

const ADD_NEW_SUB_MAPPING_HEADER = "Add New Sub Mapping";
const EDIT_SUB_MAPPING_HEADER = "Edit Sub Mapping";

export type SubMappingConfigFormProps = {
    views: View[];
    updateView: (updatedView: View) => void;
    applyModifications: (outputId: string, expression: string, viewId: string, name: string) => Promise<void>
    generateForm: (formProps: IDMFormProps) => JSX.Element;
};

export function SubMappingConfigForm(props: SubMappingConfigFormProps) {
    const { generateForm } = props;
   
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

    let defaultValues: { mappingName: string; mappingType: string ; };
    if (subMappingConfigFormData) {
        defaultValues = {
            mappingName: subMappingConfigFormData.mappingName,
            mappingType: subMappingConfigFormData.mappingType
        }
    } else {
        defaultValues = {
            mappingName: suggestedNextSubMappingName,
            mappingType: ""
        }
    }

    const isEdit = nextSubMappingIndex === -1 && !suggestedNextSubMappingName;

    const onAdd = async (data: SubMappingConfigFormData) => {
        // TODO: Implement onAdd
    };

    const onEdit = async (data: SubMappingConfigFormData) => {
        // TODO: Implement onEdit
    };

    const onCancel = () => {
        resetSubMappingConfig();
    };

    const onSubmit = (data: SubMappingConfigFormData) => {
        if (isEdit) {
            onEdit(data);
        } else {
            onAdd(data);
        }
        resetSubMappingConfig();
    };

    const mappingNameField: IDMFormField = {
        key: "name",
        label: "Name",
        type: "IDENTIFIER",
        optional: false,
        editable: true,
        documentation: "Enter the name of the sub mapping.",
        value: defaultValues.mappingName,
        valueTypeConstraint: "Global",
        enabled: true,
    };

    const mappingTypeField: IDMFormField = {
        key: "type",
        label: "Type",
        type: "TYPE",
        optional: false,
        editable: true,
        documentation: "Enter the type of the sub mapping.",
        value: defaultValues.mappingType,
        valueTypeConstraint: "Global",
        enabled: true,
    };

    const formProps: IDMFormProps = {
        targetLineRange:{ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } },
        fields: [mappingNameField, mappingTypeField],
        submitText: isEdit ? "Save" : "Add",
        onSubmit
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
                    onClick={onCancel}
                    appearance="icon"
                >
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                {generateForm(formProps)}
            </SidePanelBody>
        </SidePanel>
    );
}
