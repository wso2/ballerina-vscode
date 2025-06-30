/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import styled from "@emotion/styled";
import { Button, Codicon, Divider, SidePanel, Typography } from "@wso2/ui-toolkit";

interface ConstructorPanelProps {
    isPanelOpen: boolean;
    setPanelOpen: (value: React.SetStateAction<boolean>) => void
}

export function ConstructorPanel(props: ConstructorPanelProps) {

    const closePanel = () => {
        props.setPanelOpen(false);
    };

    const SidePanelTitleContainer = styled.div`
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 4px 16px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font: inherit;
        font-weight: bold;
        color: var(--vscode-editor-foreground);
    `;

    const SidePanelBody = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        padding: 16px;
        gap: 8px;
        overflow-y: scroll;
        height: 100%;
    `;

    const ButtonWrapper = styled.div`
        padding: 0 16px;
        border: 1px solid var(--vscode-editor-background);
        cursor: pointer;
        width: 100%;
        &:hover {
            background-color: var(--vscode-editor-hoverHighlightBackground);
            border-color: var(--vscode-focusBorder);
        }
    `;

    enum PlusMenuCategories {
        MODULE_INIT,
        CONSTRUCT,
        ENTRY_POINT
    }

    const moduleLevelEntries: any[] = [
        { name: 'Main', type: 'FunctionDefinition', category: PlusMenuCategories.ENTRY_POINT },
        { name: 'Service', type: 'ServiceDeclaration', category: PlusMenuCategories.ENTRY_POINT },
        { name: 'Trigger', type: 'TriggerList', category: PlusMenuCategories.ENTRY_POINT },
        { name: 'Record', type: 'RecordEditor', category: PlusMenuCategories.CONSTRUCT },
        { name: 'Function', type: 'FunctionDefinition', category: PlusMenuCategories.CONSTRUCT },
        { name: 'Listener', type: 'ListenerDeclaration', category: PlusMenuCategories.CONSTRUCT },
        { name: 'Enum', type: 'EnumDeclaration', category: PlusMenuCategories.CONSTRUCT },
        { name: 'Class', type: 'ClassDefinition', category: PlusMenuCategories.CONSTRUCT },
        { name: 'Connector', type: 'ModuleConnectorDecl', category: PlusMenuCategories.MODULE_INIT },
        { name: 'Variable', type: 'ModuleVarDecl', category: PlusMenuCategories.MODULE_INIT },
        { name: 'Configurable', type: 'Configurable', category: PlusMenuCategories.MODULE_INIT },
        { name: 'Constant', type: 'ConstDeclaration', category: PlusMenuCategories.MODULE_INIT },
        { name: 'Other', type: 'Custom', category: PlusMenuCategories.MODULE_INIT },
        { name: 'Data Mapper', type: 'DataMapper', category: PlusMenuCategories.CONSTRUCT }
    ];

    const entryPoints: JSX.Element[] = [];
    const constructs: JSX.Element[] = [];
    const moduleInit: JSX.Element[] = [];

    moduleLevelEntries.forEach(entry => {
        switch (entry.category) {
            case PlusMenuCategories.CONSTRUCT:
                constructs.push((
                    <ButtonWrapper>
                        <Typography variant="h4"> {entry.name} </Typography>
                    </ButtonWrapper>
                ));
                break;
            case PlusMenuCategories.ENTRY_POINT:
                entryPoints.push((
                    <ButtonWrapper>
                        <Typography variant="h4"> {entry.name} </Typography>
                    </ButtonWrapper>
                ));
                break;
            case PlusMenuCategories.MODULE_INIT:
                moduleInit.push((
                    <ButtonWrapper>
                        <Typography variant="h4"> {entry.name} </Typography>
                    </ButtonWrapper>
                ));
                break;
        }
    })

    return (
        <SidePanel
            isOpen={props.isPanelOpen}
            alignment="right"
            sx={{ transition: "all 0.3s ease-in-out" }}
        >
            <SidePanelTitleContainer>
                <Typography variant="h3">Add Constructs </Typography>
                <Button onClick={closePanel} appearance="icon"><Codicon name="close" /></Button>
            </SidePanelTitleContainer>
            <SidePanelBody>
                <Typography variant="h3">  Entry points </Typography>
                {entryPoints}
                <Divider />
                <Typography variant="h3">  Constructs </Typography>
                {constructs}
                <Divider />
                <Typography variant="h3">  Module level variables</Typography>
                {moduleInit}
                {/* <ActionButtons
                    primaryButton={{ text: "Save", onClick: () => console.log("Save Button Clicked"), tooltip: "Save Button" }}
                    secondaryButton={{ text: "Cancel", onClick: closePanel, tooltip: "Cancel Button" }}
                    sx={{ justifyContent: "flex-end" }}
                /> */}
            </SidePanelBody>
        </SidePanel>

    )
}
