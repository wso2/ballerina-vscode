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
// tslint:disable: jsx-no-multiline-js
import React, { FormEvent, useContext, useEffect, useState } from "react";

import styled from '@emotion/styled';
import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from "@vscode/webview-ui-toolkit/react";
import { Dropdown } from "@wso2/ui-toolkit";

import {
    ALL_LIBS_IDENTIFIER,
    DEFAULT_WHERE_INTERMEDIATE_CLAUSE,
    FUNCTION_CALL,
    LANG_LIBS_IDENTIFIER,
    STD_LIBS_IDENTIFIER
} from "../../constants";
import { StatementEditorContext } from "../../store/statement-editor-context";
import { ToolbarContext } from "../../store/toolbar-context";
import {
    isConfigurableEditor,
    isFunctionOrMethodCall,
    isImplicitOrExplicitNewExpr,
    isInsideConnectorParams,
    isRecordFieldName
} from "../../utils";
import { LibraryBrowser } from "../LibraryBrowser";
import { ParameterSuggestions } from "../Parameters/ParameterSuggestions";
import { ExpressionSuggestions } from "../Suggestions/ExpressionSuggestions";
import { LSSuggestions } from "../Suggestions/LangServerSuggestions";

enum TabElements {
    suggestions = 'Suggestions',
    expressions = 'Expressions',
    libraries = 'Libraries',
    parameters = 'Parameters'
}

const PanelWrapper = styled.div`
    margin-top: 10px;
    padding-left: 24px;
    padding-right: 24px;
`;

const PanelContent = styled(VSCodePanelView)`
    color: inherit;
    background-color: transparent;
    border: solid calc(var(--border-width) * 1px) transparent;
    box-sizing: border-box;
    font-size: var(--type-ramp-base-font-size);
    line-height: var(--type-ramp-base-line-height);
    padding: 10px 0 10px 3px;
`;

const PanelElement = styled(VSCodePanelTab)`
    height: 100%;
    width: 100%;
    maxHeight: 100%;
    overflow: hidden;
`;

export function HelperPane() {
    const [selectedTab, setSelectedTab] = useState(TabElements.suggestions);
    const [libraryType, setLibraryType] = useState(ALL_LIBS_IDENTIFIER);

    const {
        modelCtx: {
            currentModel
        },
        editorCtx: {
            editors,
            activeEditorId
        },
        config
    } = useContext(StatementEditorContext);

    const toolbarCtx = useContext(ToolbarContext);

    const onLibTypeSelection = (value: string) => {
        setLibraryType(value);
    };

    const onTabChange = (e: Event | FormEvent<HTMLElement>) => {
        setSelectedTab((e as any).currentTarget.activetab.id);
    }

    useEffect(() => {
        if (toolbarCtx.toolbarMoreExp === true) {
            setSelectedTab(TabElements.expressions);
            toolbarCtx.onClickMoreExp(false)
        }
    }, [toolbarCtx.toolbarMoreExp]);

    useEffect(() => {
        if (
            currentModel.model &&
            (isFunctionOrMethodCall(currentModel.model) || isInsideConnectorParams(currentModel.model, config.type) ||
                isImplicitOrExplicitNewExpr(currentModel.model)) &&
            !isConfigurableEditor(editors, activeEditorId)
        ) {
            (currentModel.model?.source?.trim() === FUNCTION_CALL) ?
                setSelectedTab(TabElements.libraries) : setSelectedTab(TabElements.parameters);
        } else if (currentModel.model && (currentModel.model?.source?.trim() === DEFAULT_WHERE_INTERMEDIATE_CLAUSE ||
            isRecordFieldName(currentModel.model))) {
            setSelectedTab(TabElements.expressions);
        } else if (isConfigurableEditor(editors, activeEditorId)) {
            setSelectedTab(TabElements.suggestions);
        }
    }, [currentModel.model]);

    return (
        <PanelWrapper>
            <VSCodePanels activeid={selectedTab} onChange={onTabChange}>
                <PanelElement id={TabElements.suggestions}>{TabElements.suggestions}</PanelElement>
                <PanelElement id={TabElements.expressions}>{TabElements.expressions}</PanelElement>
                <PanelElement id={TabElements.libraries}>{TabElements.libraries}</PanelElement>
                <PanelElement id={TabElements.parameters}>{TabElements.parameters}</PanelElement>
                <PanelContent>
                    <LSSuggestions />
                </PanelContent>
                <PanelContent>
                    <ExpressionSuggestions />
                </PanelContent>
                <PanelContent>
                    <>
                        <Dropdown
                            onValueChange={onLibTypeSelection}
                            id="lib-filter-dropdown"
                            value={libraryType}
                            items={[
                                { id: "allLibs", value: ALL_LIBS_IDENTIFIER },
                                { id: "langLibs", value: LANG_LIBS_IDENTIFIER },
                                { id: "stdLibs", value: STD_LIBS_IDENTIFIER }
                            ]}
                            data-testid="library-selector-dropdown"
                            sx={{position: 'absolute', zIndex: 1, top: '-27px', right: '0'}}
                        />
                        <LibraryBrowser libraryType={libraryType} />
                    </>
                </PanelContent>
                <PanelContent>
                    <ParameterSuggestions />
                </PanelContent>
            </VSCodePanels>
        </PanelWrapper>
    );
}
