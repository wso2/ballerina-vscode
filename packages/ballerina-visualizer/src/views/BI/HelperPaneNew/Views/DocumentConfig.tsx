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

import { useSlidingPane, CompletionItem, Divider, HelperPaneCustom, SearchBox } from "@wso2/ui-toolkit";
import { ExpressionProperty, LineRange } from "@wso2/ballerina-core";
import { useEffect, useMemo, useState } from "react";
import { getPropertyFromFormField, useFieldContext } from "@wso2/ballerina-side-panel";
import { ExpandableList } from "../Components/ExpandableList";
import { ScrollableContainer } from "../Components/ScrollableContainer";
import { EmptyItemsPlaceHolder } from "../Components/EmptyItemsPlaceHolder";
import { useHelperPaneNavigation, BreadCrumbStep } from "../hooks/useHelperPaneNavigation";
import { BreadcrumbNavigation } from "../Components/BreadcrumbNavigation";
import { DocumentInputType } from "./Documents";
import { VariableItem } from "./Variables";

type DocumentConfigProps = {
    onChange: (value: string, isRecordConfigureChange: boolean, shouldKeepHelper?: boolean) => void;
    onClose: () => void;
    targetLineRange: LineRange;
    filteredCompletions: CompletionItem[];
    currentValue: string;
    handleRetrieveCompletions: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
};

enum AIDocumentType {
    FileDocument = 'ai:FileDocument',
    ImageDocument = 'ai:ImageDocument',
    AudioDocument = 'ai:AudioDocument'
}

export const DocumentConfig = ({ onChange, onClose, targetLineRange, filteredCompletions, currentValue, handleRetrieveCompletions }: DocumentConfigProps) => {
    const { getParams } = useSlidingPane();
    const params = getParams();
    const documentType = (params?.documentType as DocumentInputType) || DocumentInputType.File;
    const [searchValue, setSearchValue] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showContent, setShowContent] = useState<boolean>(false);
    const { breadCrumbSteps, navigateToNext, navigateToBreadcrumb } = useHelperPaneNavigation(`${documentType.charAt(0).toUpperCase() + documentType.slice(1)} Document`);

    const { field, triggerCharacters } = useFieldContext();

    useEffect(() => {
        setIsLoading(true);
        const triggerCharacter =
            currentValue.length > 0
                ? triggerCharacters.find((char) => currentValue[currentValue.length - 1] === char)
                : undefined;

        // Only apply minimum loading time if we don't have any completions yet
        const shouldShowMinLoader = filteredCompletions.length === 0 && !showContent;
        const minLoadingTime = shouldShowMinLoader ? new Promise(resolve => setTimeout(resolve, 500)) : Promise.resolve();

        Promise.all([
            handleRetrieveCompletions(currentValue, getPropertyFromFormField(field), 0, triggerCharacter),
            minLoadingTime
        ]).finally(() => {
            setIsLoading(false);
            setShowContent(true);
        });

    }, [targetLineRange]);

    // Get allowed types based on document type
    const getAllowedTypes = (docType: DocumentInputType): string[] => {
        const baseTypes = ["string", "ai:Url", "byte[]"];

        switch (docType) {
            case DocumentInputType.File:
                return [...baseTypes, AIDocumentType.FileDocument];
            case DocumentInputType.Image:
                return [...baseTypes, AIDocumentType.ImageDocument];
            case DocumentInputType.Audio:
                return [...baseTypes, AIDocumentType.AudioDocument];
            default:
                return baseTypes;
        }
    };

    const dropdownItems = useMemo(() => {
        const allowedTypes = getAllowedTypes(documentType);
        const excludedDescriptions = ["Configurable", "Parameter", "Listener", "Client"];

        return filteredCompletions.filter(
            (completion) => {
                // Must be a field or variable
                if (completion.kind !== "field" && completion.kind !== "variable") {
                    return false;
                }

                // Exclude self
                if (completion.label === "self") {
                    return false;
                }

                // Exclude certain description types
                if (excludedDescriptions.some(desc =>
                    completion.labelDetails?.description?.includes(desc)
                )) {
                    return false;
                }

                // Check if the type matches any allowed type
                const description = completion.description || "";
                const labelDescription = completion.labelDetails?.description || "";

                return allowedTypes.some(type =>
                    description.includes(type) || labelDescription.includes(type)
                );
            }
        );
    }, [filteredCompletions, documentType]);

    const filteredDropDownItems = useMemo(() => {
        if (!searchValue || searchValue.length === 0) return dropdownItems;
        return dropdownItems.filter((item) =>
            item.label.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [searchValue, dropdownItems]);

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
    };

    const handleItemSelect = (value: string, item: CompletionItem) => {
        const description = item.description || "";
        const labelDescription = item.labelDetails?.description || "";
        const typeInfo = description || labelDescription;

        // Check if the type is string or byte[] - these need to be wrapped
        const needsWrapping = typeInfo.includes("string") || typeInfo.includes("byte[]");

        if (needsWrapping) {
            // Determine the document type wrapper based on documentType
            let docType = AIDocumentType.FileDocument;
            switch (documentType) {
                case DocumentInputType.Image:
                    docType = AIDocumentType.ImageDocument;
                    break;
                case DocumentInputType.Audio:
                    docType = AIDocumentType.AudioDocument;
                    break;
                default:
                    docType = AIDocumentType.FileDocument;
            }

            // Wrap the variable in the document structure
            const wrappedValue = `\${<${docType}>{content: ${value}}}`;
            onChange(wrappedValue, false);
        } else {
            // For other types (records, URL, ai:FileDocument, etc.), insert directly
            onChange(value, false);
        }
    };

    const handleVariablesMoreIconClick = (value: string) => {
        navigateToNext(value, currentValue, onChange);
    };

    const handleBreadCrumbItemClicked = (step: BreadCrumbStep) => {
        navigateToBreadcrumb(step, onChange);
    };

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
        );
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
        }}>
            <BreadcrumbNavigation
                breadCrumbSteps={breadCrumbSteps}
                onNavigateToBreadcrumb={handleBreadCrumbItemClicked}
            />
            {dropdownItems.length >= 6 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "3px 5px", height: "20px", gap: '5px' }}>
                    <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleSearch} />
                </div>
            )}

            <ScrollableContainer style={{ margin: '8px 0px' }}>
                {isLoading || !showContent ? (
                    <HelperPaneCustom.Loader />
                ) : (
                    <>
                        {filteredDropDownItems.length === 0 ? (
                            <EmptyItemsPlaceHolder message={searchValue ? "No variables found for your search" : `No variables found for ${documentType} documents`} />
                        ) : (
                            <ExpandableList>
                                <ExpandableListItems />
                            </ExpandableList>
                        )}
                    </>
                )}
            </ScrollableContainer>

            <Divider sx={{ margin: "0px" }} />
        </div>
    );
};
