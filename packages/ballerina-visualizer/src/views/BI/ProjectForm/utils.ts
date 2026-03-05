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

import { AddProjectFormData, ProjectFormData } from "./types";

export const isValidPackageName = (name: string): boolean => {
    return /^[a-z0-9_.]+$/.test(name);
};

export const validatePackageName = (name: string, integrationName: string): string | null => {
    if (integrationName.length === 0 && name.length === 0) {
        return null;
    }

    if (name.length === 0) {
        return "Package name is required";
    }

    if (!isValidPackageName(name)) {
        return "Package name can only contain lowercase letters, numbers, underscores, and dots";
    }

    if (name.startsWith("_")) {
        return "Package name cannot start with an underscore";
    }

    if (/__/.test(name)) {
        return "Package name cannot have consecutive underscores";
    }

    if (/\.{2,}/.test(name)) {
        return "Package name cannot have consecutive dots";
    }

    if (name.endsWith("_")) {
        return "Package name cannot end with an underscore";
    }

    if (name.endsWith(".")) {
        return "Package name cannot end with a dot";
    }

    if (name.length > 256) {
        return "Package name cannot exceed 256 characters";
    }

    return null; // No error
};

export const isFormValidAddProject = (formData: AddProjectFormData, isInWorkspace: boolean): boolean => {
    return (
        formData.integrationName.length >= 2 &&
        formData.packageName.length >= 2 &&
        (isInWorkspace || (formData.workspaceName?.length ?? 0) >= 1) &&
        validatePackageName(formData.packageName, formData.integrationName) === null &&
        validateOrgName(formData.orgName) === null
    );
};

export const sanitizePackageName = (name: string): string => {
    // Allow dots/underscores but sanitize other characters, then convert consecutive dots/underscores to single ones
    return name
        .replace(/[^a-z0-9._]/gi, "_")
        .toLowerCase()
        .replace(/\.{2,}/g, ".") // Convert multiple consecutive dots to single dot
        .replace(/_{2,}/g, "_"); // Convert multiple consecutive underscores to single underscore
};

// Reserved organization names
const RESERVED_ORG_NAMES = ["ballerina", "ballerinax", "wso2"];

// Org name pattern (based on Ballerina language specification for RestrictedIdentifier)
// RestrictedIdentifier := AsciiLetter RestrictedFollowingChar* RestrictedIdentifierWord*
// RestrictedIdentifierWord := _ RestrictedFollowingChar+
// RestrictedFollowingChar := AsciiLetter | Digit
// AsciiLetter := A .. Z | a .. z
const RESTRICTED_IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9]*(_[a-zA-Z0-9]+)*$/;

export const validateOrgName = (orgName: string): string | null => {
    // Empty org name is allowed (optional field)
    if (!orgName || orgName.length === 0) {
        return null;
    }

    // Check for reserved org names (case-insensitive)
    if (RESERVED_ORG_NAMES.includes(orgName.toLowerCase())) {
        return `"${orgName}" is a reserved organization name`;
    }

    // Validate against RestrictedIdentifier pattern
    if (!RESTRICTED_IDENTIFIER_REGEX.test(orgName)) {
        if (!/^[a-zA-Z]/.test(orgName)) {
            return "Organization name must start with a letter (a-z, A-Z)";
        }
        if (orgName.includes("__")) {
            return "Organization name cannot have consecutive underscores";
        }
        if (orgName.endsWith("_")) {
            return "Organization name cannot end with an underscore";
        }
        if (/_[^a-zA-Z0-9]/.test(orgName)) {
            return "Underscore must be followed by at least one letter or digit";
        }
        return "Organization name can only contain letters (a-z, A-Z), digits (0-9), and underscores";
    }

    return null;
};
