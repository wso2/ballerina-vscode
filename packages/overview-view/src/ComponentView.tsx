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
import React from "react";
import { ComponentViewInfo } from "./ComponentListView";
import { ComponentCard, Icon, Typography } from "@wso2/ui-toolkit";
// import styled from "@emotion/styled";

interface ComponentViewProps {
    type?: string;
    info: ComponentViewInfo;
    updateSelection: (info: ComponentViewInfo) => void;
}


export function ComponentView(props: ComponentViewProps) {
    const { info, type, updateSelection } = props;

    const handleComponentClick = () => {
        updateSelection(info);
    };

    const isComponentAllowed = () => {
        switch (type) {
            case 'classes':
            case 'objects':
            case 'types':
            case 'enums':
            case 'listeners':
                return false;
            default:
                return true;
        }
    }

    // const ComponentContainer = styled.div`
    //     width: 120px;
    //     display: flex;
    //     flex-direction: row;
    //     border: 1px solid #ccc; /* Add a border with a color of your choice */
    //     border-radius: 5px; /* Adjust the border-radius to your preferred value */
    //     padding: 10px; /* Add padding for better visual appearance, adjust as needed */
    // `;

    return (
        // <ComponentContainer
        //     onClick={isComponentAllowed(props.type) ? handleComponentClick : undefined}
        //     title={info.name.length ? info.name : '/'}
        // >
        //     <div className="icon">
        //        Icon XX
        //     </div>
        //     <h2>
        //         {info.name.length ? info.name : '/'}
        //     </h2>
        // </ComponentContainer>

        <ComponentCard
            id="Test"
            onClick={isComponentAllowed() ? handleComponentClick : undefined}
            sx={{
                '&:hover, &.active': {
                    '.icon svg g': {
                        fill: 'var(--vscode-editor-foreground)'
                    },
                    backgroundColor: 'var(--vscode-editor-hoverHighlightBackground)',
                    borderColor: 'var(--vscode-focusBorder)'
                },
                alignItems: 'center',
                border: '1px solid var(--vscode-editor-foreground)',
                borderRadius: 1,
                cursor: isComponentAllowed() ? 'cursor' : 'not-allowed',
                display: 'flex',
                height: 40,
                justifyContent: 'space-between',
                marginBottom: 16,
                marginRight: 16,
                padding: 10,
                width: 200
            }}
        >
            <Icon name={iconNameTranslator(type)} />
            <Typography variant="h3">
                {info.name.length ? info.name : '/'}
            </Typography>
        </ComponentCard>
    )
}


function iconNameTranslator(type: string) {
    switch (type) {
        case 'functions':
            return 'function-icon';
        case 'services':
            return 'service-icon';
        case 'records':
            return 'record-icon';
        case 'objects':
            return 'record-icon';
        case 'classes':
            return 'class-icon';
        case 'types':
            return 'record-icon';
        case 'constants':
            return 'constant-icon';
        case 'enums':
            return 'enum-icon';
        case 'listeners':
            return 'listener-icon';
        case 'moduleVariables':
            return 'variable-icon';
        default:
            return 'record-icon';
    }
}

