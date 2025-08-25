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

import { MigrationTool } from "@wso2/ballerina-core";
import { CheckBox, TextField, Typography } from "@wso2/ui-toolkit";
import React from "react";
import { ParameterItem, ParametersSection } from "../styles";

interface IntegrationParametersProps {
    selectedIntegration: MigrationTool;
    integrationParams: Record<string, any>;
    onParameterChange: (paramKey: string, value: any) => void;
}

export const IntegrationParameters: React.FC<IntegrationParametersProps> = ({
    selectedIntegration,
    integrationParams,
    onParameterChange,
}) => {
    if (!selectedIntegration || !selectedIntegration.parameters.length) return null;

    return (
        <ParametersSection>
            <Typography variant="h4" sx={{ marginBottom: 12 }}>
                Step 3: Configure {selectedIntegration.title} Settings
            </Typography>
            {selectedIntegration.parameters.map((param) => (
                <ParameterItem key={param.key}>
                    {param.type === "boolean" ? (
                        <CheckBox
                            checked={integrationParams[param.key] || false}
                            onChange={(checked) => onParameterChange(param.key, checked)}
                            label={param.label}
                        />
                    ) : (
                        <TextField
                            value={integrationParams[param.key] || ""}
                            onTextChange={(value) => onParameterChange(param.key, value)}
                            label={param.label}
                            placeholder={`Enter ${param.label.toLowerCase()}`}
                        />
                    )}
                </ParameterItem>
            ))}
        </ParametersSection>
    );
};
