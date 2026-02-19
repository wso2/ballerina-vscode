/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { AvailableNode, Category } from "@wso2/ballerina-core";
import { DevantConnectionFlow } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import styled from "@emotion/styled";

export const ProgressWrap = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
`;

export const DevantConnectionFlowTitles: Partial<Record<DevantConnectionFlow, string>> = {
    // Create related flow titles
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: "Connect to Devant service",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: "Connect to Devant service",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: "Connect to Devant service",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: "Connect via API Specification",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: "Connect to Third-Party service",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: "Connect to Third-Party service",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: "Connect to Third-Party service",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: "Connect to Third-Party service",
    // Import related flow titles
    [DevantConnectionFlow.IMPORT_INTERNAL_OAS]: "Connect to Devant service",
    [DevantConnectionFlow.IMPORT_INTERNAL_OTHER]: "Connect to Devant service",
    [DevantConnectionFlow.IMPORT_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: "Connect to Devant service",
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OAS]: "Use registered third party connection via API Specification",
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER]: "Use registered third party connection",
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: "Use registered third party connection",
};

export const DevantConnectionFlowSubTitles: Partial<Record<DevantConnectionFlow, string>> = {
    // Create related flow subtitles
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: "Connect to REST API service running in Devant",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: "Connect to service running in Devant by configuring your connector",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]:
        "Connect to service running in Devant by configuring your connector",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]:
        "Connect to Third-Party REST API service by creating and mapping configurations",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]:
        "Connect to Third-Party service by creating and mapping configurations",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]:
        "Connect to Third-Party service by configuring your connector",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]:
        "Connect to Third-Party service by configuring your Ballerina connector",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]:
        "Connect to Third-Party service from API Specification",
    // Import related flow subtitles
    [DevantConnectionFlow.IMPORT_INTERNAL_OAS]: "Connect to REST API service running in Devant",
    [DevantConnectionFlow.IMPORT_INTERNAL_OTHER]: "Connect to service running in Devant by configuring your connector",
    [DevantConnectionFlow.IMPORT_INTERNAL_OTHER_SELECT_BI_CONNECTOR]:
        "Connect to service running in Devant by configuring your connector",
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OAS]:
        "Connect to Third-Party REST API service by creating and mapping configurations",
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER]:
        "Connect to Third-Party service by creating and mapping configurations",
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]:
        "Connect to Third-Party service by configuring your connector",
};

export enum DevantConnectionFlowStep {
    VIEW_SWAGGER = "Connection Details",
    INIT_DEVANT_INTERNAL_OAS_CONNECTOR = "Create Connection",
    SELECT_BI_CONNECTOR = "Select Connector",
    INIT_CONNECTOR = "Initialize Connector",
    SELECT_OR_CREATE_BI_CONNECTOR = "Select or Create Connector",
    UPLOAD_OAS = "Upload Specification",
}

export const DEVANT_CONNECTION_FLOWS_STEPS: Partial<Record<DevantConnectionFlow, DevantConnectionFlowStep[]>> = {
    // Connection creation flow steps
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.INIT_DEVANT_INTERNAL_OAS_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: [DevantConnectionFlowStep.INIT_CONNECTOR],
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: [DevantConnectionFlowStep.INIT_CONNECTOR],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: [DevantConnectionFlowStep.INIT_CONNECTOR],
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: [
        DevantConnectionFlowStep.UPLOAD_OAS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    // Connection importing flow steps
    [DevantConnectionFlow.IMPORT_INTERNAL_OAS]: [DevantConnectionFlowStep.VIEW_SWAGGER],
    [DevantConnectionFlow.IMPORT_INTERNAL_OTHER]: [DevantConnectionFlowStep.INIT_CONNECTOR],
    [DevantConnectionFlow.IMPORT_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER]: [DevantConnectionFlowStep.INIT_CONNECTOR],
    [DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
};

export enum DevantConnectionType {
    INTERNAL = "INTERNAL",
    THIRD_PARTY = "THIRD_PARTY",
    DATABASE = "DATABASE",
}

/**
 * Generates a unique name that doesn't exist in either biConnectorNames or devantConnectorNames.
 * If the candidate name exists, appends a numeric suffix and tries again.
 *
 * @param biConnectorNames - Array of existing BI connector names
 * @param devantConnectorNames - Array of existing Devant connector names
 * @param candidateName - The initial name to try
 * @returns A unique name that doesn't conflict with existing names
 */
export const generateInitialConnectionName = (
    biConnectorNames: string[],
    devantConnectorNames: string[],
    candidateName: string,
): string => {
    // Create a Set of all existing names (case-insensitive) for O(1) lookup
    const existingNames = new Set<string>([
        ...biConnectorNames,
        ...devantConnectorNames,
        ...devantConnectorNames.map((name) => name.replaceAll("-", "_")),
    ]);

    const newCandidateName = candidateName?.replaceAll(" ", "_").replaceAll("-", "_") || "my_connection";
    let uniqueName = newCandidateName;
    let counter = 1;

    // Keep incrementing counter until we find a unique name
    while (existingNames.has(uniqueName)) {
        uniqueName = `${newCandidateName}${counter}`;
        counter++;
    }

    return uniqueName;
};

export const isValidDevantConnName = (value: string, devantConnNames: string[], biConnNames: string[]) => {
    // Check minimum length
    if (!value) {
        return "Connection name is required";
    }
    if (value.length < 3) {
        return "Connection name must be at least 3 characters long";
    }

    if (value.length > 50) {
        return "Connection Name is too long";
    }

    // Check for valid format: alphanumeric and underscores only, can't start with number
    const validNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validNameRegex.test(value)) {
        if (/^[0-9]/.test(value)) {
            return "Connection name cannot start with a number";
        }
        return "Connection name can only contain letters, numbers, and underscores";
    }

    // Check for duplicates in Devant connections
    if (devantConnNames?.some((conn) => conn === value)) {
        return "A Devant connection with this name already exists";
    }

    // Check for duplicates in BI connections
    if (biConnNames?.some((conn) => conn === value)) {
        return "Duplicate connection name";
    }
};

export const getKnownAvailableNode = (categories: Category[], org: string, module: string) => {
    const networkConnectors = categories?.find((item) => item.metadata.label === "Network");
    const matchingNode = networkConnectors?.items?.find(
        (item) => (item as AvailableNode).codedata?.org === org && (item as AvailableNode).codedata?.module === module,
    );
    return matchingNode as AvailableNode | undefined;
};
