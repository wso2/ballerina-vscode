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
import React, { useContext, useEffect, useState } from "react";

import { ErrorIcon, WarningIcon } from "@wso2/ballerina-core";
import { NodePosition, ResourceAccessorDefinition } from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context } from "../../../../Context/diagram";
import { HeaderActionsWithMenu } from "../../../../HeaderActions";
import { HeaderWrapper } from "../../../../HeaderWrapper";
import { getDiagnosticInfo } from "../../../../Utils";

import { ResourceOtherParams } from "./ResourceOtherParams";
import { ResourceQueryParams } from "./ResourceQueryParams";
import "./style.scss";

interface ResourceHeaderProps {
    model: ResourceAccessorDefinition;
    onExpandClick: () => void;
    isExpanded: boolean;
}

export function ResourceHeader(props: ResourceHeaderProps) {
    const { model, onExpandClick, isExpanded } = props;

    const sourceSnippet = model?.source;
    const diagnostics = model?.typeData?.diagnostics;
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);
    const diagramContext = useContext(Context);
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);
    const { isReadOnly } = diagramContext.props;

    const onDeleteClick = () => {
        if (deleteComponent) {
            deleteComponent(model);
        }
    };

    const onClickOpenInCodeView = () => {
        if (model && gotoSource) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }
    const openInCodeView = !isReadOnly && model && model.position && onClickOpenInCodeView;

    const errorIcon = diagnosticMsgs?.severity === "ERROR" ? <ErrorIcon /> : <WarningIcon />;

    const errorSnippet = {
        diagnosticMsgs: diagnosticMsgs?.message,
        code: sourceSnippet,
        severity: diagnosticMsgs?.severity
    }
    const iconElement = (
        <div className="error-icon-wrapper">
            {errorIcon}
        </div>
    );


    // TODO:Check this and fix the tooltip rendering issue
    useEffect(() => {
        if (diagnosticMsgs && showTooltip) {
            setTooltip(showTooltip(iconElement, errorSnippet.diagnosticMsgs, undefined, model));
        }
    }, [model]);

    return (
        <HeaderWrapper
            className={classNames("function-signature", model.functionName.value)}
            onClick={onExpandClick}
        >
            <div className={classNames("resource-badge", model.functionName.value)}>
                <p className={"text"}>{model.functionName.value.toUpperCase()}</p>
            </div>
            <div className="param-wrapper">
                <ResourceQueryParams
                    parameters={model.functionSignature.parameters}
                    relativeResourcePath={model.relativeResourcePath}
                />
                <ResourceOtherParams parameters={model.functionSignature.parameters} />
            </div>
            <div className="return-type">
                {model.functionSignature.returnTypeDesc?.source}
            </div>
            {diagnosticMsgs ?
                (
                    <div>
                        {tooltip ? tooltip : iconElement}
                    </div>
                )
                : null
            }

            <HeaderActionsWithMenu
                model={model}
                isExpanded={isExpanded}
                onExpandClick={onExpandClick}
                onConfirmDelete={onDeleteClick}
                isResource={true}
            />
        </HeaderWrapper >
    );
}
