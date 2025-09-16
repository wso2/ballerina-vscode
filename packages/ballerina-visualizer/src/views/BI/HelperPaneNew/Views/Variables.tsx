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

import { ExpandableList } from "../Components/ExpandableList"
import { VariableTypeIndicator } from "../Components/VariableTypeIndicator"
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane"
import { useRpcContext } from "@wso2/ballerina-rpc-client"
import { DataMapperDisplayMode, ExpressionProperty, FlowNode, LineRange, RecordTypeField } from "@wso2/ballerina-core"
import { Codicon, CompletionItem, Divider, getIcon, HelperPaneCustom, SearchBox, ThemeColors, Typography } from "@wso2/ui-toolkit"
import { useEffect, useMemo, useRef, useState } from "react"
import { getPropertyFromFormField, useFieldContext } from "@wso2/ballerina-side-panel"
import FooterButtons from "../Components/FooterButtons"
import { FormGenerator } from "../../Forms/FormGenerator"
import { ScrollableContainer } from "../Components/ScrollableContainer"
import { FormSubmitOptions } from "../../FlowDiagram"
import { URI } from "vscode-uri"
import styled from "@emotion/styled"
import { POPUP_IDS, useModalStack } from "../../../../Context"

type VariablesPageProps = {
    fileName: string;
    debouncedRetrieveCompletions?: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
    onChange: (value: string, isRecordConfigureChange: boolean, shouldKeepHelper?: boolean) => void;
    targetLineRange: LineRange;
    anchorRef: React.RefObject<HTMLDivElement>;
    handleOnFormSubmit?: (updatedNode?: FlowNode, dataMapperMode?: DataMapperDisplayMode, options?: FormSubmitOptions, openDMInPopup?: boolean) => void;
    selectedType?: CompletionItem;
    filteredCompletions: CompletionItem[];
    currentValue: string;
    recordTypeField?: RecordTypeField;
    isInModal?: boolean;
    handleRetrieveCompletions: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
    onClose?: () => void;
}

type VariableItemProps = {
    item: CompletionItem;
    onItemSelect: (value: string) => void;
    onMoreIconClick: (value: string) => void;
}

const VariableItem = ({ item, onItemSelect, onMoreIconClick }: VariableItemProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <SlidingPaneNavContainer
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onItemSelect(item.label)}
            data
            sx={{
                maxHeight: isHovered ? "none" : "32px"
            }}
            endIcon={
                <VariablesMoreIconContainer style={{ height: "10px" }} onClick={(event) => {
                    event.stopPropagation();
                    onMoreIconClick(item.label);
                }}>
                    <VariableTypeIndicator >
                        {item.description}
                    </VariableTypeIndicator>
                    <Codicon name="chevron-right" />
                </VariablesMoreIconContainer>}
        >
            <ExpandableList.Item>
                {getIcon(item.kind)}
                <Typography
                    variant="body3"
                    sx={{
                        maxWidth: isHovered ? '30ch' : '20ch',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: isHovered ? 'normal' : 'nowrap',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {item.label}
                </Typography>
            </ExpandableList.Item>
        </SlidingPaneNavContainer>
    );
};

const VariablesMoreIconContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
     &:hover {
        cursor: pointer;
    }
`;

type BreadCrumbStep = {
    label: string;
    replaceText: string
}

export const Variables = (props: VariablesPageProps) => {
    const { fileName, targetLineRange, onChange, onClose, handleOnFormSubmit, selectedType, filteredCompletions, currentValue, recordTypeField, isInModal, handleRetrieveCompletions } = props;
    const [searchValue, setSearchValue] = useState<string>("");
    const { rpcClient } = useRpcContext();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const newNodeNameRef = useRef<string>("");
    const [projectPathUri, setProjectPathUri] = useState<string>();
    const [breadCrumbSteps, setBreadCrumbSteps] = useState<BreadCrumbStep[]>([{
        label: "Variables",
        replaceText: ""
    }]);
    const { addModal, closeModal } = useModalStack()

    const { field, triggerCharacters } = useFieldContext();

    useEffect(() => {
        getProjectInfo()
    }, []);

    useEffect(() => {
        const triggerCharacter =
            currentValue.length > 0
                ? triggerCharacters.find((char) => currentValue[currentValue.length - 1] === char)
                : undefined;

        handleRetrieveCompletions(currentValue, getPropertyFromFormField(field), 0, triggerCharacter);
    }, [targetLineRange])

    const getProjectInfo = async () => {
        const projectPath = await rpcClient.getVisualizerLocation();
        setProjectPathUri(URI.file(projectPath.projectUri).fsPath);
    }

    const handleSubmit = (updatedNode?: FlowNode, dataMapperMode?: DataMapperDisplayMode) => {
        newNodeNameRef.current = "";
        // Safely extract the variable name as a string, fallback to empty string if not available
        const varName = typeof updatedNode?.properties?.variable?.value === "string"
            ? updatedNode.properties.variable.value
            : "";
        newNodeNameRef.current = varName;
        handleOnFormSubmit?.(
            updatedNode,
            dataMapperMode === DataMapperDisplayMode.VIEW ? DataMapperDisplayMode.POPUP : DataMapperDisplayMode.NONE,
            {
                closeSidePanel: false, updateLineRange: true, postUpdateCallBack: () => {
                    onClose()
                    closeModal(POPUP_IDS.VARIABLE);
                    onChange(newNodeNameRef.current, false, true);
                }
            },
        );
    };
    const fields = filteredCompletions.filter((completion) => (completion.kind === "field" || completion.kind === "variable") && completion.label !== 'self')
    const methods = filteredCompletions.filter((completion) => completion.kind === "function")

    const dropdownItems =
        currentValue.length > 0
            ? fields.concat(methods)
            : fields;

    const filteredDropDownItems = useMemo(() => {
        if (!searchValue || searchValue.length === 0) return dropdownItems;
        return dropdownItems.filter((item) =>
            item.label.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [searchValue, dropdownItems]);

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
    };

    const handleItemSelect = (value: string) => {
        onChange(value, false);
    }

    const handleAddNewVariable = () => {
        addModal(
            <FormGenerator
                fileName={fileName}
                node={selectedNode}
                connections={[]}
                targetLineRange={targetLineRange}
                projectPath={projectPathUri}
                editForm={false}
                onSubmit={handleSubmit}
                showProgressIndicator={false}
                resetUpdatedExpressionField={() => { }}
                isInModal={true}
            />, POPUP_IDS.VARIABLE, "New Variable", 600);
        onClose && onClose();
    }
    const handleVariablesMoreIconClick = (value: string) => {
        const newBreadCrumSteps = [...breadCrumbSteps, {
            label: value,
            replaceText: currentValue + value
        }];
        setBreadCrumbSteps(newBreadCrumSteps);
        onChange(value + '.', false, true);
    }

    const handleBreadCrumbItemClicked = (step: BreadCrumbStep) => {
        const replaceText = step.replaceText === '' ? step.replaceText : step.replaceText + '.';
        onChange(replaceText, true);
        const index = breadCrumbSteps.findIndex(item => item.label === step.label);
        const newSteps = index !== -1 ? breadCrumbSteps.slice(0, index + 1) : breadCrumbSteps;
        setBreadCrumbSteps(newSteps);
    }

    const ExpandableListItems = () => {
        return (
            <>
                {
                    filteredDropDownItems.map((item) => (
                        <VariableItem
                            key={item.label}
                            item={item}
                            onItemSelect={handleItemSelect}
                            onMoreIconClick={handleVariablesMoreIconClick}
                        />
                    ))
                }
            </>
        )
    }


    const getTypeDef = () => {
        return (
            {
                metadata: {
                    label: "Type",
                    description: "Type of the variable",
                },
                valueType: "TYPE",
                value: selectedType?.label,
                placeholder: "var",
                optional: false,
                editable: true,
                advanced: false,
                hidden: false,
            }
        )

    }


    const selectedNode: FlowNode = {
        codedata: {
            node: 'VARIABLE',
            isNew: true,
        },
        flags: 0,
        id: "31",
        metadata: {
            label: 'Declare Variable',
            description: 'New variable with type'
        },
        properties: {
            variable: {
                metadata: {
                    label: "Name",
                    description: "Name of the variable",
                },
                valueType: "IDENTIFIER",
                value: "var1",
                optional: false,
                editable: true,
                advanced: false,
                hidden: false,
            },
            type: getTypeDef(),
            expression: {
                metadata: {
                    label: "Expression",
                    description: "Expression of the variable",
                },
                valueType: "ACTION_OR_EXPRESSION",
                value: "",
                optional: true,
                editable: true,
                advanced: false,
                hidden: false,
            },
        },
        returning: false,
        branches: []
    };

    const findNodeWithName = (node: FlowNode, name: string) => {
        return node?.properties?.variable?.value === name;
    }

    const searchNodes = (nodes: FlowNode[], name: string): FlowNode | undefined => {
        for (const node of nodes) {
            if (findNodeWithName(node, name)) {
                return node;
            }
            if (node.branches && node.branches.length > 0) {
                for (const branch of node.branches) {
                    if (branch.children && branch.children.length > 0) {
                        const foundNode = searchNodes(branch.children, name);
                        if (foundNode) {
                            return foundNode;
                        }
                    }
                }
            }
        }
        return undefined;
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
        }}>

            {
                breadCrumbSteps.length > 1 && (
                    <div style={{ display: "flex", gap: '8px', padding: '5px 8px', backgroundColor: ThemeColors.SURFACE_DIM_2 }}>
                        {breadCrumbSteps.map((step, index) => (
                            <span key={index} style={{ cursor: 'pointer', color: ThemeColors.HIGHLIGHT }}>
                                <span onClick={() => handleBreadCrumbItemClicked(step)}>
                                    {step.label}
                                </span>
                                {index < breadCrumbSteps.length - 1 && <span style={{ margin: '0 8px' }}>{'>'}</span>}
                            </span>
                        ))}

                    </div>
                )}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "3px 8px", gap: '5px' }}>
                <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleSearch} />
            </div>

            <ScrollableContainer style={{ margin: '8px 0px' }}>
                {isLoading ? (
                    <HelperPaneCustom.Loader />
                ) : (
                    <ExpandableList>
                        <ExpandableListItems />
                    </ExpandableList>
                )}
            </ScrollableContainer>

            <Divider sx={{ margin: "0px" }} />
            {isInModal ? null : <div style={{ padding: '3px' }}><FooterButtons onClick={handleAddNewVariable} startIcon='add' title="New Variable" /></div>}
        </div>
    )
}
