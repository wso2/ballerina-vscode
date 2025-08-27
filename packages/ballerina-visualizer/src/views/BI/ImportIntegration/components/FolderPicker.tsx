import { Button } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import {
    FolderPathText,
    FolderSelectionContainer,
    SelectedFolderContainer,
    SelectedFolderDisplay,
} from "../styles";

interface FolderPickerProps {
    selectedPath: string;
    onPathChange: (path: string) => void;
    onSelectPath: () => Promise<{ path: string }>;
    buttonText?: string;
    selectingText?: string;
}

export function FolderPicker({
    selectedPath,
    onPathChange,
    onSelectPath,
    buttonText = "Select Project",
    selectingText = "Selecting...",
}: FolderPickerProps) {
    const [folderSelectionStarted, setFolderSelectionStarted] = useState(false);

    // Reset folderSelectionStarted when selectedPath changes (e.g., when switching integration platforms)
    useEffect(() => {
        if (selectedPath === "") {
            setFolderSelectionStarted(false);
        }
    }, [selectedPath]);

    const handleFolderSelection = async () => {
        setFolderSelectionStarted(true);
        const selectedFolder = await onSelectPath();
        onPathChange(selectedFolder.path);
        if (selectedFolder.path === "") {
            setFolderSelectionStarted(false);
        }
    };

    return (
        <>
            {!selectedPath ? (
                <FolderSelectionContainer>
                    <Button
                        onClick={handleFolderSelection}
                        appearance="secondary"
                        disabled={folderSelectionStarted}
                    >
                        {folderSelectionStarted ? selectingText : buttonText}
                    </Button>
                </FolderSelectionContainer>
            ) : (
                <SelectedFolderContainer>
                    <SelectedFolderDisplay>
                        <FolderPathText>{selectedPath}</FolderPathText>
                        <Button
                            onClick={handleFolderSelection}
                            appearance="secondary"
                            sx={{ marginLeft: "12px" }}
                        >
                            Change
                        </Button>
                    </SelectedFolderDisplay>
                </SelectedFolderContainer>
            )}
        </>
    );
}