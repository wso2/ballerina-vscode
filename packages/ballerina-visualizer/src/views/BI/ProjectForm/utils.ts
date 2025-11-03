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

// Import from the component file since types.ts was removed
import { ProjectFormData } from "./ProjectFormFields";

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

    return null; // No error
};

export const isFormValid = (formData: ProjectFormData): boolean => {
    return (
        formData.integrationName.length >= 2 &&
        formData.packageName.length >= 2 &&
        formData.path.length >= 2 &&
        validatePackageName(formData.packageName, formData.integrationName) === null
    );
};

export const sanitizePackageName = (name: string): string => {
    // Allow dots but sanitize other characters, then convert consecutive dots to single dot
    return name
        .replace(/[^a-z0-9._]/gi, "_")
        .toLowerCase()
        .replace(/\.{2,}/g, "."); // Convert multiple consecutive dots to single dot
};
