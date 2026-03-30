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

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Codicon, Dropdown, TextField } from "@wso2/ui-toolkit";
import { WICommandIds } from "@wso2/wso2-platform-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FieldGroup, Note } from "../styles";
import { CollapsibleSection } from "./CollapsibleSection";
import { sanitizePackageName } from "../utils";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";

export interface PackageInfoData {
    packageName: string;
    orgName: string;
    version: string;
}

export interface Organization {
    id?: number | string;
    handle: string;
    name: string;
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
    /** Whether the package is a library */
    isLibrary?: boolean;
    /** Error message for org name validation */
    orgNameError?: string | null;
    /** Error message for package name validation */
    packageNameError?: string | null;
    /** Organizations list — when provided, renders a dropdown instead of a free-text field */
    organizations?: Organization[];
}

// ── Sign-in hint styles ────────────────────────────────────────────────────────

const SignInHint = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const SignInHintButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    background: none;
    border: none;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
        color: var(--vscode-textLink-activeForeground);
        text-decoration: underline;
    }

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    &:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
    }
`;

// ── Component ──────────────────────────────────────────────────────────────────

export function PackageInfoSection({
    isExpanded,
    onToggle,
    data,
    onChange,
    isLibrary,
    orgNameError,
    packageNameError,
    organizations,
}: PackageInfoSectionProps) {
    const { rpcClient } = useRpcContext();
    const { platformExtState } = usePlatformExtContext();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const signingInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasOrgs = organizations && organizations.length > 0;

    useEffect(() => {
        if (platformExtState?.userInfo && isSigningIn) {
            setIsSigningIn(false);
            if (signingInTimeoutRef.current) {
                clearTimeout(signingInTimeoutRef.current);
                signingInTimeoutRef.current = null;
            }
        }
    }, [platformExtState?.userInfo, isSigningIn]);

    useEffect(() => {
        return () => {
            if (signingInTimeoutRef.current) clearTimeout(signingInTimeoutRef.current);
        };
    }, []);

    const handleSignIn = () => {
        setIsSigningIn(true);
        signingInTimeoutRef.current = setTimeout(() => {
            setIsSigningIn(false);
            signingInTimeoutRef.current = null;
        }, 15000);
        rpcClient.getCommonRpcClient().executeCommand({ commands: [WICommandIds.SignIn] });
    };

    return (
        <CollapsibleSection
            isExpanded={isExpanded}
            onToggle={onToggle}
            icon="gear"
            title="Advanced Configurations"
        >
            <Note style={{ marginBottom: "16px" }}>
                {`This ${isLibrary ? "library" : "integration"} is generated as a Ballerina package. Specify the organization and version to be assigned. `}
            </Note>
            <FieldGroup>
                <TextField
                    onTextChange={(value) => onChange({ packageName: sanitizePackageName(value) })}
                    value={data.packageName}
                    label="Package Name"
                    description={`Specify the package name.`}
                    errorMsg={packageNameError || undefined}
                />
            </FieldGroup>
            <FieldGroup>
                {hasOrgs ? (
                    <Dropdown
                        id="org-name-dropdown"
                        label="Organization Name"
                        items={organizations.map((org) => ({ value: org.handle, content: org.name }))}
                        value={data.orgName}
                        onValueChange={(value: string) => onChange({ orgName: value })}
                    />
                ) : (
                    <>
                        <TextField
                            onTextChange={(value) => onChange({ orgName: value })}
                            value={data.orgName}
                            label="Organization Name"
                            description="The organization that owns the package."
                            errorMsg={orgNameError || undefined}
                        />
                        <SignInHint>
                            <Codicon
                                name="account"
                                iconSx={{ color: "var(--vscode-descriptionForeground)" }}
                                sx={{ display: "flex" }}
                            />
                            <span>Sign in to pick from your organizations —</span>
                            <SignInHintButton type="button" onClick={handleSignIn} disabled={isSigningIn}>
                                {isSigningIn ? (
                                    <>
                                        <Codicon
                                            name="loading"
                                            iconSx={{ fontSize: "11px", animation: "codicon-spin 1.5s steps(30) infinite" }}
                                        />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </SignInHintButton>
                        </SignInHint>
                    </>
                )}
            </FieldGroup>
            <FieldGroup>
                <TextField
                    onTextChange={(value) => onChange({ version: value })}
                    value={data.version}
                    label="Package Version"
                    placeholder="0.1.0"
                    description="Version of the package."
                />
            </FieldGroup>
        </CollapsibleSection>
    );
}
