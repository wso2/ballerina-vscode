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
import { FormField, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { FormGeneratorNew } from "../Forms/FormGeneratorNew";
import { getImportsForProperty } from "../../../utils/bi";
import { LineRange } from "@wso2/ballerina-core";

const Container = styled.div`
    max-width: 600px;
    height: 100%;
    > div:last-child {
        > div:last-child {
            justify-content: flex-start;
        }
    }
`;

const FormContainer = styled.div`
    > div:first-child {
        padding: 0;
    }
`;

interface ConfigProps {
    isSaving: boolean;
    formFields: FormField[];
    targetLineRange: LineRange;
    disableSaveButton?: boolean;
    onSubmit: (data: FormField[], rawData: FormValues) => void;
    onBack?: () => void;
}

export function ConfigForm(props: ConfigProps) {
    const { isSaving, formFields, targetLineRange, disableSaveButton, onSubmit, onBack } = props;
    console.log(">>> ConfigForm props", props);

    const handleSubmit = async (data: FormValues, formImports: FormImports) => {
        formFields.forEach((val) => {
            if (val.type === "DROPDOWN_CHOICE") {
                val.dynamicFormFields[data[val.key]].forEach((dynamicField) => {
                    if (data[dynamicField.key]) {
                        dynamicField.value = data[dynamicField.key];
                    }
                });
                val.value = data[val.key];
            } else if (data[val.key]) {
                val.value = data[val.key];
            }
            val.imports = getImportsForProperty(val.key, formImports);
        });
        onSubmit(formFields, data);
    };

    // type field hide
    const typeField = formFields.find((field) => field.key === "type");
    if (typeField) {
        typeField.enabled = false;
    }

    return (
        <Container>
            {formFields && formFields.length > 0 && (
                <FormContainer>
                    {targetLineRange && (
                        <FormGeneratorNew
                            fileName={targetLineRange.fileName}
                            targetLineRange={targetLineRange}
                            fields={formFields}
                            onBack={onBack}
                            onSubmit={handleSubmit}
                            submitText={isSaving ? "Saving..." : "Save"}
                            compact={true}
                            disableSaveButton={disableSaveButton || isSaving}
                            helperPaneSide="left"
                            isSaving={isSaving}
                        />
                    )}
                </FormContainer>
            )}
        </Container>
    );
}

export default ConfigForm;
