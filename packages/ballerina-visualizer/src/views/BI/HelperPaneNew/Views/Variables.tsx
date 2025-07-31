import { ExpandableList } from "../Components/ExpandableList"
import { VariableTypeIndifcator } from "../Components/VariableTypeIndicator"
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane"
import { useRpcContext } from "@wso2/ballerina-rpc-client"
import { ExpressionProperty, FlowNode, LineRange, RecordTypeField } from "@wso2/ballerina-core"
import {  Codicon, COMPLETION_ITEM_KIND, CompletionItem, Divider, getIcon, HelperPaneCustom, SearchBox, ThemeColors } from "@wso2/ui-toolkit"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {  HelperPaneVariableInfo } from "@wso2/ballerina-side-panel"
import { debounce } from "lodash"
import { convertToHelperPaneVariable, filterHelperPaneVariables } from "../../../../utils/bi"
import FooterButtons from "../Components/FooterButtons"
import DynamicModal from "../Components/Modal"
import { FormGenerator } from "../../Forms/FormGenerator"
import { ScrollableContainer } from "../Components/ScrollableContainer"
import { FormSubmitOptions } from "../../FlowDiagram"
import { URI } from "vscode-uri"

type VariablesPageProps = {
    fileName: string;
    debouncedRetrieveCompletions?: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
    onChange: (value: string, isRecordConfigureChange: boolean) => void;
    targetLineRange: LineRange;
    anchorRef: React.RefObject<HTMLDivElement>;
    handleOnFormSubmit?: (updatedNode?: FlowNode, isDataMapperFormUpdate?: boolean, options?: FormSubmitOptions) => void;
    selectedType?: CompletionItem;
    filteredCompletions: CompletionItem[];
    currentValue: string;
    variables: CompletionItem[]
    recordTypeField?:RecordTypeField;
    isInModal?:boolean;
}


export const Variables = (props: VariablesPageProps) => {
    const { fileName, targetLineRange, onChange, anchorRef, handleOnFormSubmit, selectedType, filteredCompletions, currentValue, recordTypeField, isInModal } = props;
    const [searchValue, setSearchValue] = useState<string>("");
    const { rpcClient } = useRpcContext();
    const firstRender = useRef<boolean>(true);
    const [variableInfo, setVariableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [filteredVariableInfo, setFilteredVariableInfo] = useState<HelperPaneVariableInfo | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const newNodeNameRef = useRef<string>("");
    const isMainVariablesRef = useRef<boolean>(true)
    const [currentlyVisitingItemType, setCurrentlyVisitingItemType] = useState<string>("")
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [projectPathUri, setProjectPathUri] = useState<string>();

    useEffect(() => {
        getVariableInfo()
    }, [targetLineRange])

    useEffect(()=>{
        getProjectInfo()
    },[]);

    const getProjectInfo = async () => {
        const projectPath = await rpcClient.getVisualizerLocation();
        setProjectPathUri(URI.file(projectPath.projectUri).fsPath);
    }

    const getVariableInfo = useCallback(() => {
        setIsLoading(true);
        rpcClient
            .getBIDiagramRpcClient()
            .getVisibleVariableTypes({
                filePath: fileName,
                position: {
                    line: targetLineRange.startLine.line,
                    offset: targetLineRange.startLine.offset
                }
            })
            .then((response) => {
                if (response.categories?.length) {
                    const convertedHelperPaneVariable: HelperPaneVariableInfo = convertToHelperPaneVariable(response.categories);
                    setVariableInfo(convertedHelperPaneVariable);
                    setFilteredVariableInfo(convertedHelperPaneVariable);
                }
            })
            .then(() => setIsLoading(false));
    }, [rpcClient, fileName, targetLineRange]);

    const handleSubmit = (updatedNode?: FlowNode, isDataMapperFormUpdate?: boolean) => {
        newNodeNameRef.current = "";
        // Safely extract the variable name as a string, fallback to empty string if not available
        const varName = typeof updatedNode?.properties?.variable?.value === "string"
            ? updatedNode.properties.variable.value
            : "";
        newNodeNameRef.current = varName;
        handleOnFormSubmit?.(updatedNode, isDataMapperFormUpdate, { shouldCloseSidePanel: false, shouldUpdateTargetLine: true });
        if (isModalOpen) {
            setIsModalOpen(false)
            getVariableInfo();
        }
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getVariableInfo();
        }
    }, []);

    const debounceFilterVariables = useCallback(
        debounce((searchText: string) => {
            setFilteredVariableInfo(filterHelperPaneVariables(variableInfo, searchText));
            setIsLoading(false);
        }, 150),
        [variableInfo, setFilteredVariableInfo, setIsLoading, filterHelperPaneVariables, searchValue]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterVariables(searchText);
    };

    const isSelectedYypesMatches = (type: string) => {
        return selectedType?.label === type
    }

    const isObjectFieldsExists = (objectFields: CompletionItem[]) => {
        return objectFields && objectFields.length > 0
    }

    const handleItemSelect = (value: string, type: string) => {
        setCurrentlyVisitingItemType(type)
        if (isSelectedYypesMatches(type)) {
            onChange(value, false)
        }
        else {
            const insertValue = currentValue + value + '.'
            onChange(insertValue, true)
        }
        isMainVariablesRef.current = false
    }

    const handleFunctionItemClicked = (value: string) => {
        onChange(value, false)
    }

    const handleUseAnywayClicked = (type: string) => {
        onChange(type, false)
    }

    const handleNoFunctionsGoBack = () => {
        const parts = currentValue.split(".");
        if (parts.length <= 2) return "";
        parts.splice(parts.length - 2, 1);
        onChange(parts.join("."), true);
    }

    const handleBreadCrumbItemClicked = (variableName: string) => {
        const patternStartIndex = currentValue.indexOf(variableName);
        if (patternStartIndex === -1) return;
        const newValue = currentValue.slice(0, patternStartIndex + variableName.length) + '.';
        onChange(newValue, true);
    }

    const objectFields = filteredCompletions.filter((completion) => completion.kind === "field")
    const objectMethods = filteredCompletions.filter((completion) => completion.kind === "function" && completion.description === selectedType?.label)


    const ExpandableListItems = () => {
        if (!isSelectedYypesMatches(currentlyVisitingItemType) && !isObjectFieldsExists(objectFields) && !isMainVariablesRef.current) {
            return (
                <div>
                    <p style={{ color: ThemeColors.ON_SURFACE_VARIANT }}>
                        This variable type is not compatible with the{" "}
                        <span style={{ color: ThemeColors.HIGHLIGHT }}>
                            {selectedType?.label}
                        </span>{" "}
                        type. Do you wish to add it in the same type, or would you prefer to convert
                        it to a
                        {" "}
                        <span style={{ color: ThemeColors.HIGHLIGHT }}>
                            {selectedType?.label}
                        </span>{" "}
                        value using the helpers below?
                    </p>
                    {
                        !objectMethods || objectMethods.length === 0 ?
                            <><span style={{ color: ThemeColors.ON_SURFACE_VARIANT }}>No helpers to show </span> <span onClick={handleNoFunctionsGoBack} style={{ color: ThemeColors.HIGHLIGHT, cursor: 'pointer' }}> Go Back</span></> : <>
                                {
                                    objectMethods.map((item) => (
                                        <SlidingPaneNavContainer data>
                                            <ExpandableList.Item sx={{ height: '10px' }} onClick={() => handleFunctionItemClicked(item.label)}>
                                                {getIcon(COMPLETION_ITEM_KIND.Function)} <p>{item.label} </p>
                                            </ExpandableList.Item>
                                        </SlidingPaneNavContainer>
                                    ))
                                }
                            </>
                    }
                </div>
            )
        }

        return (
            <>
                {
                    !isObjectFieldsExists(objectFields) ? (<>{filteredVariableInfo?.category.map((cat) => (
                        <>
                            {
                                cat.items.map((item) => (
                                    <SlidingPaneNavContainer data>
                                        <ExpandableList.Item onClick={() => handleItemSelect(item.label, item.type)}>
                                            <p style={{ margin: '0px' }}>{item.label} </p>
                                            <VariableTypeIndifcator type={item.type} />
                                            {!isSelectedYypesMatches(item.type) &&
                                                <>
                                                    <span style={{ color: ThemeColors.ON_SURFACE_VARIANT }}> Not assignable</span>
                                                    <span onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleUseAnywayClicked(item.label)
                                                    }} style={{ color: ThemeColors.HIGHLIGHT, marginLeft: "auto" }}>
                                                        Use anyway
                                                    </span>
                                                </>}
                                        </ExpandableList.Item>
                                    </SlidingPaneNavContainer>
                                ))
                            }
                        </>
                    ))}</>) :
                        (
                            <>
                                {
                                    objectFields.map((item) => (
                                        <SlidingPaneNavContainer data>
                                            <ExpandableList.Item onClick={() => handleItemSelect(item.label, item.description)}>
                                                <span>{item.label}</span>
                                                <VariableTypeIndifcator type={item.description} />
                                                {!isSelectedYypesMatches(item.description) &&
                                                    <>
                                                        <span style={{ color: ThemeColors.ON_SURFACE_VARIANT }}> Not assignable</span>
                                                        <span onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleUseAnywayClicked(item.label)
                                                        }} style={{ color: ThemeColors.HIGHLIGHT, marginLeft: "auto" }}>
                                                            Use anyway
                                                        </span>
                                                    </>}
                                            </ExpandableList.Item>
                                        </SlidingPaneNavContainer>
                                    ))
                                }
                            </>
                        )
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
            <div style={{ display: 'flex', color: ThemeColors.HIGHLIGHT, marginBottom: '10px' }}>
                {
                    breadCrumSteps.map((item, index) => {
                        if (index === 0) {
                            return (
                                <div style={{ display: 'flex' }}>
                                    <span onClick={() => handleBreadCrumbItemClicked(item)}>{`${item}`}</span>
                                </div>
                            )
                        }
                        else {
                            return (
                                <div style={{ display: 'flex', gap: '3px' }}>
                                    <Codicon name={"chevron-right"}></Codicon>
                                    <span onClick={() => handleBreadCrumbItemClicked(item)}>{`${item}`}</span>
                                </div>)
                        }
                    })
                }
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "10px", gap: '5px' }}>
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

           {!isInModal &&  <div style={{ marginTop: "auto" }}>
                <Divider />
                <DynamicModal 
                width={400} 
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
