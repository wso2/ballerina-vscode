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

import { useEffect, useState } from "react";
import {
    Button,
    Icon,
    LocationSelector,
    TextField,
    Typography,
    Codicon,
    CheckBox,
    LinkButton,
    ThemeColors,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 80px 120px;
    max-width: 600px;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
`;

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const IconButton = styled.div`
    cursor: pointer;
    border-radius: 4px;
    width: 20px;
    height: 20px;
    font-size: 20px;
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const CheckboxContainer = styled.div`
    margin: 16px 0;
`;

const FieldGroup = styled.div`
    margin-bottom: 20px;
`;

const OptionalConfigRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 8px;
`;

const OptionalConfigButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    justify-content: flex-end;
`;

const OptionalConfigContent = styled.div`
    margin-top: 16px;
`;

const sanitizePackageName = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
};

const isValidPackageName = (name: string): boolean => {
    return /^[a-z0-9_]+$/.test(name);
};

export function ProjectForm() {
    const { rpcClient } = useRpcContext();
    const [integrationName, setIntegrationName] = useState("");
    const [packageName, setPackageName] = useState("");
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [path, setPath] = useState("");
    const [createDirectory, setCreateDirectory] = useState(true);
    const [showOptionalConfigurations, setShowOptionalConfigurations] = useState(false);
    const [orgName, setOrgName] = useState("");
    const [version, setVersion] = useState("");

    const handleIntegrationName = (value: string) => {
        setIntegrationName(value);
        // Auto-populate package name if user hasn't manually edited it
        if (!packageNameTouched) {
            setPackageName(sanitizePackageName(value));
        }
    };

    const handlePackageName = (value: string) => {
        // Only allow valid package name characters
        const sanitized = sanitizePackageName(value);
        setPackageName(sanitized);
        setPackageNameTouched(value.length > 0);
    };

    const handleCreateProject = () => {
        const finalPath = createDirectory ? path : path;
        rpcClient.getBIDiagramRpcClient().createProject({
            projectName: integrationName,
            packageName: packageName,
            projectPath: finalPath,
            createDirectory: createDirectory,
            orgName: orgName || undefined,
            version: version || undefined,
        });
    };

    const handleShowOptionalConfigurations = () => {
        setShowOptionalConfigurations(true);
    };

    const handleHideOptionalConfigurations = () => {
        setShowOptionalConfigurations(false);
    };

    const handleProjectDirSelection = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        setPath(projectDirectory.path);
    };

    useEffect(() => {
        (async () => {
            const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
            setPath(currentDir.path);
        })();
    }, []);

    const gotToWelcome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWelcome,
            },
        });
    };

    return (
        <FormContainer>
            <TitleContainer>
                <IconButton onClick={gotToWelcome}>
                    <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
                </IconButton>
                <Typography variant="h2">Create Your Integration</Typography>
            </TitleContainer>

            <FieldGroup>
                <TextField
                    onTextChange={handleIntegrationName}
                    value={integrationName}
                    label="Integration Name"
                    placeholder="Enter an integration name"
                    autoFocus={true}
                    required={true}
                />
            </FieldGroup>

            <FieldGroup>
                <TextField
                    onTextChange={handlePackageName}
                    value={packageName}
                    label="Package Name"
                    description="Ballerina package name created for your integration."
                />
            </FieldGroup>

            <FieldGroup>
                <LocationSelector
                    label="Select Integration Path"
                    selectedFile={path}
                    btnText="Select Path"
                    onSelect={handleProjectDirSelection}
                />

                <CheckboxContainer>
                    <CheckBox
                        label="Create a new directory using the package name"
                        checked={createDirectory}
                        onChange={setCreateDirectory}
                    />
                </CheckboxContainer>
            </FieldGroup>

            <OptionalConfigRow>
                Optional Configurations
                <OptionalConfigButtonContainer>
                    {!showOptionalConfigurations && (
                        <LinkButton
                            onClick={handleShowOptionalConfigurations}
                            sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4, userSelect: "none" }}
                        >
                            <Codicon name={"chevron-down"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                            Expand
                        </LinkButton>
                    )}
                    {showOptionalConfigurations && (
                        <LinkButton
                            onClick={handleHideOptionalConfigurations}
                            sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4, userSelect: "none" }}
                        >
                            <Codicon name={"chevron-up"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                            Collapsed
                        </LinkButton>
                    )}
                </OptionalConfigButtonContainer>
            </OptionalConfigRow>

            {showOptionalConfigurations && (
                <OptionalConfigContent>
                    <FieldGroup>
                        <TextField
                            onTextChange={setOrgName}
                            value={orgName}
                            label="Organization Name"
                            description="The organization that will own the Ballerina package created for your integration."
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <TextField
                            onTextChange={setVersion}
                            value={version}
                            label="Package Version"
                            placeholder="0.1.0"
                            description="Version of the Ballerina package created for your integration."
                        />
                    </FieldGroup>
                </OptionalConfigContent>
            )}

            <ButtonWrapper>
                <Button
                    disabled={
                        integrationName.length < 2 ||
                        packageName.length < 2 ||
                        path.length < 2 ||
                        !isValidPackageName(packageName)
                    }
                    onClick={handleCreateProject}
                    appearance="primary"
                >
                    Create Integration
                </Button>
            </ButtonWrapper>
        </FormContainer>
    );
}
