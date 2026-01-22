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

import { TextField } from "@wso2/ui-toolkit";
import { FieldGroup } from "../styles";
import { CollapsibleSection } from "./CollapsibleSection";

export interface PackageInfoData {
    orgName: string;
    version: string;
}

export interface PackageInfoSectionProps {
    /** Whether the section is expanded */
    isExpanded: boolean;
    /** Callback when the section is toggled */
    onToggle: () => void;
    /** The package info data */
    data: PackageInfoData;
    /** Callback when the package info changes */
    onChange: (data: Partial<PackageInfoData>) => void;
}

export function PackageInfoSection({
    isExpanded,
    onToggle,
    data,
    onChange,
}: PackageInfoSectionProps) {
    return (
        <CollapsibleSection
            isExpanded={isExpanded}
            onToggle={onToggle}
            icon="package"
            title="Package Information"
            subtitle={data.orgName || undefined}
        >
            <FieldGroup>
                <TextField
                    onTextChange={(value) => onChange({ orgName: value })}
                    value={data.orgName}
                    label="Organization Name"
                    description="The organization that owns this Ballerina package."
                />
            </FieldGroup>
            <FieldGroup>
                <TextField
                    onTextChange={(value) => onChange({ version: value })}
                    value={data.version}
                    label="Package Version"
                    placeholder="0.1.0"
                    description="Version of the Ballerina package."
                />
            </FieldGroup>
        </CollapsibleSection>
    );
}

