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
import { SidePanelBody } from "@wso2/ui-toolkit";
import ButtonCard from "../../../../../components/ButtonCard";
import { ServiceModel } from "@wso2/ballerina-core";

import { EditorContentColumn } from "../../styles";

interface FunctionConfigFormProps {
    onBack?: () => void;
    isSaving: boolean;
    onSubmit?: (selectedHandler: string) => void;
    serviceModel: ServiceModel;
}

export function FunctionConfigForm(props: FunctionConfigFormProps) {

    const { onBack, onSubmit, isSaving, serviceModel } = props;

    const events = [
        { name: 'onCreate', description: 'Triggered when a new file is created' },
        { name: 'onDelete', description: 'Triggered when a file is deleted' },
        { name: 'onError', description: 'Triggered when an error occurs during file processing' }
    ];

    // Check if all functions with a specific metadata.label are enabled
    const hasAvailableFunctions = (handlerType: string) => {
        const functionsWithHandler = serviceModel.functions?.filter(fn => fn.metadata?.label === handlerType) || [];
        if (functionsWithHandler.length === 0) return false;

        // Return true if there's at least one non-enabled function
        return functionsWithHandler.some(fn => !fn.enabled);
    };

    const handleEventClick = (handlerName: string) => {
        onSubmit && onSubmit(handlerName);
    };

    // Filter events to only show those with available functions
    const availableEvents = events.filter(event => hasAvailableFunctions(event.name));

    return (
        <SidePanelBody>
            <EditorContentColumn>
                {availableEvents.map((event, index) => {
                    const handleClick = () => handleEventClick(event.name);
                    return (
                        <ButtonCard
                            key={event.name}
                            id={`event-card-${index}`}
                            title={event.name}
                            tooltip={event.description}
                            onClick={handleClick}
                            disabled={isSaving}
                        />
                    );
                })}
            </EditorContentColumn>
        </SidePanelBody>
    );
}

export default FunctionConfigForm;

