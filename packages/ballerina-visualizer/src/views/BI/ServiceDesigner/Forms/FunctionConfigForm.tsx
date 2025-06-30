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

import React, { useState } from "react";
import { ActionButtons, Dropdown, SidePanelBody } from "@wso2/ui-toolkit";
import { FunctionModel, ServiceModel } from "@wso2/ballerina-core";

import { EditorContentColumn } from "../styles";

interface FunctionConfigFormProps {
    serviceModel: ServiceModel;
    onSubmit?: (model: FunctionModel) => void;
    onBack?: () => void;
    isSaving: boolean;
}

export function FunctionConfigForm(props: FunctionConfigFormProps) {

    const { serviceModel, onSubmit, onBack, isSaving } = props;

    const options = serviceModel.functions.filter(func => !func.enabled).map((func, index) => ({ id: index.toString(), value: func.name.value }));
    const [functionName, setFunctionName] = useState<string>(options.length > 0 ? options[0].value : undefined);

    const handleOnSelect = (value: string) => {
        setFunctionName(value);
    };

    const handleConfigSave = () => {
        const selectedFunction = serviceModel.functions.find(func => func.name.value === functionName);
        selectedFunction.enabled = true;
        onSubmit(selectedFunction);
    };

    return (
        <SidePanelBody>
            <EditorContentColumn>
                <Dropdown
                    id="function-selector"
                    sx={{ zIndex: 2, width: "100%", marginBottom: 20 }}
                    isRequired
                    items={options}
                    label="Available Functions"
                    onValueChange={handleOnSelect}
                    value={functionName}
                />
                <ActionButtons
                    primaryButton={{ text: isSaving ? "Saving..." : "Save", onClick: handleConfigSave, disabled: isSaving, loading: isSaving }}
                    secondaryButton={{ text: "Cancel", onClick: onBack, disabled: isSaving }}
                    sx={{ justifyContent: "flex-end" }}
                />
            </EditorContentColumn>
        </SidePanelBody>
    );
}

export default FunctionConfigForm;

