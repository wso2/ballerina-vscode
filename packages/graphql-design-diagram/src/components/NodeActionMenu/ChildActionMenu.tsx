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

// tslint:disable: jsx-no-multiline-js jsx-no-lambda jsx-wrap-multiline  no-implicit-dependencies no-submodule-imports
import React, { useEffect, useState } from "react";

import { NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import { ContextMenu, Item } from "@wso2/ui-toolkit";

import { useGraphQlContext } from "../DiagramContext/GraphqlDiagramContext";
import { getDesignServiceField, getServiceFieldEdit } from "../MenuItems/menuItems";
import { verticalIconSubMenu, verticalIconWrapperSubMenu } from "../MenuItems/style";
import { FunctionType, Position } from "../resources/model";
import { getParentSTNodeFromRange } from "../utils/common-util";
import { getSyntaxTree } from "../utils/ls-util";

interface ChildActionMenuProps {
    functionType: FunctionType;
    location: Position;
    path?: string;
}

export function ChildActionMenu(props: ChildActionMenuProps) {
    const { functionType, location, path } = props;
    const { langClientPromise, currentFile, fullST, operationDesignView, functionPanel } = useGraphQlContext();

    const [showTooltip, setTooltipStatus] = useState<boolean>(false);
    const [currentModel, setCurrentModel] = useState<STNode>(null);
    const [currentST, setST] = useState<STNode>(fullST);

    useEffect(() => {
        if (showTooltip) {
            let parentModel: STNode;
            (async () => {
                const nodePosition: NodePosition = {
                    endColumn: location.endLine.offset,
                    endLine: location.endLine.line,
                    startColumn: location.startLine.offset,
                    startLine: location.startLine.line
                };
                if (location.filePath === currentFile.path) {
                    const parentNode = getParentSTNodeFromRange(nodePosition, fullST);
                    parentModel = parentNode;
                } else {
                    // parent node is retrieved as the classObject.position only contains the position of the class name
                    const syntaxTree: STNode = await getSyntaxTree(location.filePath, langClientPromise);
                    const parentNode = getParentSTNodeFromRange(nodePosition, syntaxTree);
                    parentModel = parentNode;
                    setST(syntaxTree)
                }
                if (parentModel && STKindChecker.isClassDefinition(parentModel)) {
                    parentModel.members.forEach((resource: any) => {
                        if (STKindChecker.isResourceAccessorDefinition(resource)) {
                            if (resource.relativeResourcePath.length === 1 && resource.relativeResourcePath[0]?.value === path) {
                                setCurrentModel(resource);
                            }
                        }
                    });
                }
            })();
            setTooltipStatus(false);
        }
    }, [showTooltip]);

    const getMenuItems = () => {
        const menuItems: Item[] = [];
        if (currentModel && currentST) {
            menuItems.push(getServiceFieldEdit(currentModel, functionType, location, currentST, functionPanel));
            menuItems.push(getDesignServiceField(currentModel, location, operationDesignView));
        }
        return menuItems;
    }

    return (
        <>
            {location?.filePath && location?.startLine && location?.endLine &&
                <div onClick={() => setTooltipStatus(true)}>
                    <ContextMenu iconSx={verticalIconSubMenu} sx={verticalIconWrapperSubMenu} menuItems={getMenuItems()} />
                </div>
            }
        </>
    );
}
