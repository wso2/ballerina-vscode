import styled from "@emotion/styled";
import { Button, Codicon, FormContainer, LocationSelector, TextField, Tooltip, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { sanitizeProjectName } from "../ProjectForm";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { BodyText } from "../../styles";

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const InputPreviewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 20px 0;
`;

const PreviewText = styled(Typography)`
    color: var(--vscode-sideBarTitle-foreground);
    opacity: 0.5;
    font-family: var(--vscode-editor-font-family, "Monaco", "Menlo", "Ubuntu Mono", monospace);
    word-break: break-all;
    min-width: 100px;
    display: flex;
    align-items: center;
    line-height: 1;
`;

const PreviewIcon = styled(Codicon)`
    display: flex;
    align-items: center;
`;

const PreviewContainer = styled.div`
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    height: 28px;
    gap: 8px;
    background-color: var(--vscode-editor-background);
    * {
        cursor: default !important;
    }
`;
const LocationSelectorWrapper = styled.div`
    margin-top: 20px;
`;
interface FormProps {
    onNext: (projectName: string, projectPath: string) => void;
}

export function ConfigureProjectForm({ onNext }: FormProps) {
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
