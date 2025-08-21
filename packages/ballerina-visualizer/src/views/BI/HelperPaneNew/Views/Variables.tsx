import { ExpandableList } from "../Components/ExpandableList"
import { VariableTypeIndicator } from "../Components/VariableTypeIndicator"
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane"
import { useRpcContext } from "@wso2/ballerina-rpc-client"
import { ExpressionProperty, FlowNode, LineRange, RecordTypeField } from "@wso2/ballerina-core"
import { Codicon, CompletionItem, Divider, HelperPaneCustom, SearchBox, ThemeColors, Typography } from "@wso2/ui-toolkit"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getPropertyFromFormField, HelperPaneVariableInfo, useFieldContext } from "@wso2/ballerina-side-panel"
import { debounce } from "lodash"
import { filterHelperPaneVariables } from "../../../../utils/bi"
import FooterButtons from "../Components/FooterButtons"
import DynamicModal from "../Components/Modal"
import { FormGenerator } from "../../Forms/FormGenerator"
import { ScrollableContainer } from "../Components/ScrollableContainer"
import { FormSubmitOptions } from "../../FlowDiagram"
import { URI } from "vscode-uri"
import styled from "@emotion/styled"

type VariablesPageProps = {
    fileName: string;
    debouncedRetrieveCompletions?: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
    onChange: (value: string, isRecordConfigureChange: boolean) => void;
    targetLineRange: LineRange;
    anchorRef: React.RefObject<HTMLDivElement>;
    handleOnFormSubmit?: (updatedNode?: FlowNode, openInDataMapper?: boolean, options?: FormSubmitOptions) => void;
    selectedType?: CompletionItem;
    filteredCompletions: CompletionItem[];
    currentValue: string;
    variables: CompletionItem[]
    recordTypeField?: RecordTypeField;
    isInModal?: boolean;
    handleRetrieveCompletions: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
}

const VariablesMoreIconContainer = styled.div`
    display: flex;
    min-wdith: 20px;
    align-items: center;
    justify-content: center;
    padding: 4px;
     &:hover {
        background-color:  ${ThemeColors.ON_SURFACE_VARIANT};
        cursor: pointer;
    }
`;

export const Variables = (props: VariablesPageProps) => {
    const { fileName, targetLineRange, onChange, anchorRef, handleOnFormSubmit, selectedType, filteredCompletions, currentValue, recordTypeField, isInModal, handleRetrieveCompletions } = props;
    const [searchValue, setSearchValue] = useState<string>("");
    const { rpcClient } = useRpcContext();
    const [variableInfo, setVariableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [filteredVariableInfo, setFilteredVariableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const newNodeNameRef = useRef<string>("");
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [projectPathUri, setProjectPathUri] = useState<string>();

    const { field, triggerCharacters } = useFieldContext();

    useEffect(() => {
        getProjectInfo()
    }, []);

    useEffect(() => {
        const triggerCharacter =
            currentValue.length > 0
                ? triggerCharacters.find((char) => currentValue[currentValue.length - 1] === char)
                : undefined;

        console.log("Trigger Character:", triggerCharacter);
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

    const handleSubmit = (updatedNode?: FlowNode, openInDataMapper?: boolean) => {
        newNodeNameRef.current = "";
        // Safely extract the variable name as a string, fallback to empty string if not available
        const varName = typeof updatedNode?.properties?.variable?.value === "string"
            ? updatedNode.properties.variable.value
            : "";
        newNodeNameRef.current = varName;
        handleOnFormSubmit?.(updatedNode, false, { shouldCloseSidePanel: false, shouldUpdateTargetLine: true });
        if (isModalOpen) {
            setIsModalOpen(false)
        }
    };
    const fields = filteredCompletions.filter((completion) => (completion.kind === "field" || completion.kind === "variable") && completion.label !== 'self')
    const methods = filteredCompletions.filter((completion) => completion.kind === "function")

    const dropdownItems = fields.concat(methods)

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
        onChange(currentValue + value, false);
    }

    const handleVariablesMoreIconClick = (value: string) => {
        onChange(currentValue + value + '.', true);
    }

    const handleBreadCrumbItemClicked = (variableName: string) => {
        const patternStartIndex = currentValue.indexOf(variableName);
        if (patternStartIndex === -1) return;
        const newValue = currentValue.slice(0, patternStartIndex + variableName.length) + '.';
        onChange(newValue, true);
    }

    const ExpandableListItems = () => {
        return (
            <>
                {
                    filteredDropDownItems.map((item) => (
                        <SlidingPaneNavContainer
                            onClick={() => handleItemSelect(item.label)}
                            data
                            endIcon={
                                <VariablesMoreIconContainer onClick={(event) => {
                                    event.stopPropagation()
                                    handleVariablesMoreIconClick(item.label)
                                }}>
                                    <VariableTypeIndicator>
                                        {item.description}
                                    </VariableTypeIndicator>
                                    <Codicon name="chevron-right" />
                                </VariablesMoreIconContainer>}
                        >
                            <ExpandableList.Item>
                                <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                    {item.label}
                                </Typography>

                            </ExpandableList.Item>
                        </SlidingPaneNavContainer>
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
                optional: false,
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

    const breadCrumSteps = useMemo(() => {
        const variableNames = currentValue.split('.');
        if (variableNames.length < 3) return [];
        variableNames.pop();
        return variableNames;
    }, [currentValue])

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
        }}>
            {
                breadCrumSteps && breadCrumSteps.length > 0 && (
                    <div style={{ display: "flex", gap: '8px', padding: '8px' }}>
                        {breadCrumSteps.map((step, index) => (
                            <span
                                key={index}
                                onClick={() => handleBreadCrumbItemClicked(step)}
                                style={{ cursor: 'pointer', color: ThemeColors.HIGHLIGHT }}
                            >
                                {step}
                            </span>
                        ))}
                    </div>
                )}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "8px", gap: '5px' }}>
                <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleSearch} />
            </div>

            <ScrollableContainer>
                {isLoading ? (
                    <HelperPaneCustom.Loader />
                ) : (
                    <ExpandableList>
                        <ExpandableListItems />
                    </ExpandableList>
                )}
            </ScrollableContainer>

            {!isInModal && <div style={{ marginTop: "auto" }}>
                <Divider />
                <DynamicModal
                    width={420}
                    height={600}
                    anchorRef={anchorRef}
                    title="Declare Variable"
                    openState={isModalOpen}
                    setOpenState={setIsModalOpen}>
                    <DynamicModal.Trigger>
                        <FooterButtons startIcon='add' title="New Variable" />
                    </DynamicModal.Trigger>
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
                    />
                </DynamicModal>
            </div>}
        </div>
    )
}
