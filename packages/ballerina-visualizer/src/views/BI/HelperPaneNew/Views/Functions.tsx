import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { HelperPaneCompletionItem, HelperPaneFunctionInfo } from "@wso2/ballerina-side-panel";
import { debounce } from "lodash";
import { useRef, useState, useCallback, RefObject, useEffect } from "react";
import { convertToHelperPaneFunction, extractFunctionInsertText } from "../../../../utils/bi";
import { CompletionInsertText, FunctionKind, LineRange } from "@wso2/ballerina-core";
import { useMutation } from "@tanstack/react-query";
import { ExpandableList } from "../Components/ExpandableList";
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane";
import { COMPLETION_ITEM_KIND, getIcon, HelperPaneCustom } from "@wso2/ui-toolkit/lib/components/ExpressionEditor";
import { EmptyItemsPlaceHolder } from "../Components/EmptyItemsPlaceHolder";
import styled from "@emotion/styled";
import { Divider, Overlay, SearchBox, ThemeColors } from "@wso2/ui-toolkit";
import { LoadingContainer } from "../../../styles";
import { createPortal } from "react-dom";
import { LibraryBrowser } from "../../HelperPane/LibraryBrowser";
import { LoadingRing } from "../../../../components/Loader";
import { ScrollableContainer } from "../Components/ScrollableContainer";
import FormGenerator from "../../Forms/FormGenerator";
import FooterButtons from "../Components/FooterButtons";
import DynamicModal from "../Components/Modal";
import { URI, Utils } from "vscode-uri";
import { FunctionFormStatic } from "../../FunctionFormStatic";
type FunctionsPageProps = {
    fieldKey: string;
    anchorRef: RefObject<HTMLDivElement>;
    fileName: string;
    targetLineRange: LineRange;
    onClose: () => void;
    onChange: (insertText: CompletionInsertText) => void;
    updateImports: (key: string, imports: { [key: string]: string }) => void;
};

export const FunctionsPage = ({
    fieldKey,
    anchorRef,
    fileName,
    targetLineRange,
    onClose,
    onChange,
    updateImports,
}: FunctionsPageProps) => {

    const { rpcClient } = useRpcContext();
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');
    const [isLibraryBrowserOpen, setIsLibraryBrowserOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [functionInfo, setFunctionInfo] = useState<HelperPaneFunctionInfo | undefined>(undefined);
    const [libraryBrowserInfo, setLibraryBrowserInfo] = useState<HelperPaneFunctionInfo | undefined>(undefined);
    const [projectUri, setProjectUri] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);



    //TODO: get the correct filepath
    let defaultFunctionsFile = Utils.joinPath(URI.file(projectUri), 'functions.bal').fsPath;

    const debounceFetchFunctionInfo = useCallback(
        debounce((searchText: string, includeAvailableFunctions?: string) => {
            setIsLoading(true);
            rpcClient
                .getBIDiagramRpcClient()
                .search({
                    position: targetLineRange,
                    filePath: fileName,
                    queryMap: {
                        q: searchText.trim(),
                        limit: 12,
                        offset: 0,
                        ...(!!includeAvailableFunctions && { includeAvailableFunctions })
                    },
                    searchKind: "FUNCTION"
                })
                .then((response) => {
                    if (response.categories?.length) {
                        if (!!includeAvailableFunctions) {
                            setLibraryBrowserInfo(convertToHelperPaneFunction(response.categories));
                        } else {
                            setFunctionInfo(convertToHelperPaneFunction(response.categories));
                        }
                    }
                    console.log(response);
                })
                .then(() => setIsLoading(false));
        }, 150),
        [rpcClient, fileName, targetLineRange]
    );

    const fetchFunctionInfo = useCallback(
        (searchText: string, includeAvailableFunctions?: string) => {
            debounceFetchFunctionInfo(searchText, includeAvailableFunctions);
        },
        [debounceFetchFunctionInfo, searchValue]
    );

    const { mutateAsync: addFunction, isPending: isAddingFunction } = useMutation({
        mutationFn: (item: HelperPaneCompletionItem) =>
            rpcClient.getBIDiagramRpcClient().addFunction({
                filePath: fileName,
                codedata: item.codedata,
                kind: item.kind as FunctionKind,
                searchKind: 'FUNCTION'
            })
    });

    const onFunctionItemSelect = async (item: HelperPaneCompletionItem) => {
        setIsLoading(true);
        const response = await addFunction(item);

        setIsLoading(false)
        if (response) {
            const importStatement = {
                [response.prefix]: response.moduleId
            };
            updateImports(fieldKey, importStatement);
            return extractFunctionInsertText(response.template);
        }

        return { value: '' };
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            fetchFunctionInfo('');
        }

        setDefaultFunctionsPath()
    }, []);

    const setDefaultFunctionsPath = () => {
        rpcClient.getVisualizerLocation().then((location)=> {
            setProjectUri(location?.projectUri || '')
        })
    }

    const handleFunctionSearch = (searchText: string) => {
        setSearchValue(searchText);

        // Search functions
        if (isLibraryBrowserOpen) {
            fetchFunctionInfo(searchText, 'true');
        } else {
            fetchFunctionInfo(searchText);
        }
    };

    const handleFunctionItemSelect = async (item: HelperPaneCompletionItem) => {
        const { value, cursorOffset } = await onFunctionItemSelect(item);
        onChange({ value, cursorOffset });
        onClose();
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "10px" }}>
                <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleFunctionSearch} />
            </div>
            <ScrollableContainer>
                {

                    isLoading ? (
                        <HelperPaneCustom.Loader />
                    ) : (
                        <>
                            {
                                !functionInfo || !functionInfo.category || functionInfo.category.length === 0 ? (
                                    <EmptyItemsPlaceHolder />
                                ) : (
                                    functionInfo.category.map((category) => {
                                        if (!category.subCategory) {
                                            if (!category.items || category.items.length === 0) {
                                                return null;
                                            }

                                            return (
                                                <ExpandableList>
                                                    <ExpandableList.Section sx={{ marginTop: '20px' }} key={category.label} title={category.label} level={0}>
                                                        <div style={{ marginTop: '10px' }}>
                                                            {category.items.map((item) => (
                                                                <SlidingPaneNavContainer>
                                                                   <ExpandableList.Item
                                                                        key={item.label}
                                                                        sx={{ color: ThemeColors.ON_SURFACE }}
                                                                        onClick={async () => await handleFunctionItemSelect(item)}
                                                                    >
                                                                        {getIcon(COMPLETION_ITEM_KIND.Function)}
                                                                        <FunctionItemLabel>{`${item.label}()`}</FunctionItemLabel>
                                                                    </ExpandableList.Item>
                                                                </SlidingPaneNavContainer>
                                                            ))}
                                                        </div>
                                                    </ExpandableList.Section>
                                                </ExpandableList>
                                            )
                                        }

                                        //if sub category is empty
                                        if (category.subCategory.length === 0) {
                                            return null;
                                        }

                                        return (
                                            <ExpandableList>
                                                {category.subCategory.map((subCategory) => (
                                                    <ExpandableList.Section sx={{ marginTop: '20px' }} key={subCategory.label} title={subCategory.label} level={0}>
                                                        <div style={{ marginTop: '10px' }}>
                                                            {subCategory.items.map((item) => (
                                                                <SlidingPaneNavContainer>
                                                                    <ExpandableList.Item
                                                                        key={item.label}
                                                                        sx={{ color: ThemeColors.ON_SURFACE }}
                                                                        onClick={async () => await handleFunctionItemSelect(item)}
                                                                    >
                                                                        {getIcon(COMPLETION_ITEM_KIND.Function)}
                                                                        <FunctionItemLabel>{`${item.label}()`}</FunctionItemLabel>
                                                                    </ExpandableList.Item>
                                                                </SlidingPaneNavContainer>
                                                            ))}
                                                        </div>
                                                    </ExpandableList.Section>
                                                ))}
                                            </ExpandableList>
                                        )
                                    })
                                )
                            }
                        </>
                    )
                }
            </ScrollableContainer>
            <div style={{ marginTop: "auto", gap: '10px' }}>
                <Divider />
                <DynamicModal width={500} height={600} anchorRef={anchorRef} title="Dynamic Modal" openState={isModalOpen} setOpenState={setIsModalOpen}>
                    <DynamicModal.Trigger>
                        <FooterButtons sx={{ display: 'flex', justifyContent: 'space-between' }} startIcon='add' title="New Function" />
                    </DynamicModal.Trigger>
                    <FunctionFormStatic
                        projectPath={projectUri}
                        filePath={defaultFunctionsFile}
                        functionName={undefined}
                        isDataMapper={false}
                    />
                </DynamicModal>
                <FooterButtons sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', marginTop: '10px' }} startIcon='add' title="Open Function Browser" onClick={() => setIsLibraryBrowserOpen(true)} />

            </div>
            {isLibraryBrowserOpen && (
                <LibraryBrowser
                    anchorRef={anchorRef}
                    isLoading={isLoading}
                    libraryBrowserInfo={libraryBrowserInfo as HelperPaneFunctionInfo}
                    setFilterText={handleFunctionSearch}
                    onBack={() => setIsLibraryBrowserOpen(false)}
                    onClose={onClose}
                    onChange={onChange}
                    onFunctionItemSelect={onFunctionItemSelect}
                />
            )}
            {isAddingFunction && createPortal(
                <>
                    <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 5000 }} />
                    <LoadingContainer> <LoadingRing /> </LoadingContainer>
                </>
                , document.body
            )}
        </div>
    )
}

const FunctionItemLabel = styled.span`
    font-size: 13px;
`;

// <ExpandableList.Section key={cat.label} title={cat.label}>
// {cat.items.map((item) => (
//     <ExpandableList.Item key={item.label}>{item.label}</ExpandableList.Item>
// ))}
// </ExpandableList.Section>