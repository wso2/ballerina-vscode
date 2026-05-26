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
import React, { useState } from "react";

import { TreeContainer } from "../commons/Tree/Tree";
import { useDMIOConfigPanelStore } from "../../../../store/store";
import { Codicon } from "@wso2/ui-toolkit";
import { Label } from "../../OverriddenLinkLayer/LabelWidget";
import { useShallow } from "zustand/react/shallow";

export interface DataImportNodeWidgetProps {
    configName: string;
    ioType: string;
}

export function DataImportNodeWidget(props: DataImportNodeWidgetProps) {
    const {configName, ioType} = props;

    const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
        useShallow(state => ({
            setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
            setIOConfigPanelType: state.setIOConfigPanelType,
            setIsSchemaOverridden: state.setIsSchemaOverridden
        }))
    );

    const handleOnClick = () => {
        setIsIOConfigPanelOpen(true);
        setIOConfigPanelType(ioType);
        setIsSchemaOverridden(false);
    };

    return (
        <div >
            <TreeContainer>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', backgroundColor: 'var(--vscode-activityBarTop.activeForeground' }}>
                <div style={{padding: '100px', justifyContent: 'space-between'}}>
                    <Codicon sx={{ margin: 5, zoom: 5}}  name="new-file" onClick={handleOnClick} />
                    <Label style={{fontSize:15}}>Import {ioType} Schema</Label>
                </div>
                </div>
            </TreeContainer>
        </div >
    );
}
