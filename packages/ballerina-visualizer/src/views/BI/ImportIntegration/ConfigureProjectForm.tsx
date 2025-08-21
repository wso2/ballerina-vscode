import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, FormContainer, LocationSelector, TextField, Tooltip, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { BodyText } from "../../styles";
import {
    ButtonWrapper,
    InputPreviewWrapper,
    LocationSelectorWrapper,
    PreviewContainer,
    PreviewIcon,
    PreviewText,
} from "./styles";
import { ConfigureProjectFormProps } from "./types";
import { sanitizeProjectName } from "./utils";


export function ConfigureProjectForm({ onNext }: ConfigureProjectFormProps) {
    const { rpcClient } = useRpcContext();
    const [name, setName] = useState("");
    const [path, setPath] = useState("");

    const isPathValid = path.length > 2;
    const isCreateProjectDisabled = !isPathValid || name.length < 2;

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

    return (
        <FormContainer>
            <Typography variant="h2">Configure Your Integration Project</Typography>
            <BodyText>Please provide the necessary details to create your integration project.</BodyText>
            <InputPreviewWrapper>
                <TextField
                    onTextChange={setName}
                    value={name}
                    label="Integration Name"
                    placeholder="Enter an integration name"
                    autoFocus={true}
                />
                <PreviewContainer>
                    <PreviewIcon
                        name="project"
                        iconSx={{ fontSize: 14, color: "var(--vscode-descriptionForeground)" }}
                    />
                    <Tooltip content="A unique identifier for your integration">
                        <PreviewText variant="caption">
                            {name ? sanitizeProjectName(name) : "integration_id"}
                        </PreviewText>
                    </Tooltip>
                </PreviewContainer>
            </InputPreviewWrapper>
            <LocationSelectorWrapper>
                <LocationSelector
                    label="Project Location"
                    selectedFile={path}
                    btnText={isPathValid ? "Change Path" : "Select Path"}
                    onSelect={handleProjectDirSelection}
                />
            </LocationSelectorWrapper>
            <ButtonWrapper>
                <Button disabled={isCreateProjectDisabled} onClick={() => onNext(name, path)} appearance="primary">
                    Create and Open Project
                </Button>
            </ButtonWrapper>
        </FormContainer>
    );
}
