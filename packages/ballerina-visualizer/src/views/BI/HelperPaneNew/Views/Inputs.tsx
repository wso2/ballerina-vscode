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
import { TypeIndicator } from "../Components/TypeIndicator"
import { ExpressionProperty, LineRange } from "@wso2/ballerina-core"
import { Codicon, CompletionItem, HelperPaneCustom, SearchBox, ThemeColors, Tooltip, Typography } from "@wso2/ui-toolkit"
import { useEffect, useMemo, useState } from "react"
import { getPropertyFromFormField, useFieldContext } from "@wso2/ballerina-side-panel"
import { ScrollableContainer } from "../Components/ScrollableContainer"
import { HelperPaneIconType, getHelperPaneIcon } from "../utils/iconUtils"
import { EmptyItemsPlaceHolder } from "../Components/EmptyItemsPlaceHolder"
import { shouldShowNavigationArrow } from "../utils/types"
import { HelperPaneListItem } from "../Components/HelperPaneListItem"
import { useHelperPaneNavigation, BreadCrumbStep } from "../hooks/useHelperPaneNavigation"
import { BreadcrumbNavigation } from "../Components/BreadcrumbNavigation"

type InputsPageProps = {
    fileName: string;
    onChange: (value: string, isRecordConfigureChange: boolean, shouldKeepHelper?: boolean) => void;
    targetLineRange: LineRange;
    anchorRef: React.RefObject<HTMLDivElement>;
    filteredCompletions: CompletionItem[];
    currentValue: string;
    handleRetrieveCompletions: (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => Promise<void>;
}

type InputItemProps = {
    item: CompletionItem;
    onItemSelect: (value: string) => void;
    onMoreIconClick: (value: string) => void;
}

const InputItem = ({ item, onItemSelect, onMoreIconClick }: InputItemProps) => {
    const showArrow = shouldShowNavigationArrow(item);

    const mainContent = (
        <>
            {getHelperPaneIcon(HelperPaneIconType.INPUT)}
            <Typography variant="body3" sx={{ flex: 1, mr: 1 }}>
                {item.label}
            </Typography>
            <Tooltip content={item.description} position="top">
                <TypeIndicator>
                    {item.description}
                </TypeIndicator>
            </Tooltip>
        </>
    );

    const endAction = showArrow ? (
        <Codicon
            name="chevron-right"
        />
    ) : undefined;

    return (
        <HelperPaneListItem
            onClick={() => onItemSelect(item.label)}
            endAction={endAction}
            onClickEndAction={() => onMoreIconClick(item.label)}
        >
            {mainContent}
        </HelperPaneListItem>
    );
};

export const Inputs = (props: InputsPageProps) => {
    const { targetLineRange, onChange, filteredCompletions, currentValue, handleRetrieveCompletions } = props;
    const [searchValue, setSearchValue] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showContent, setShowContent] = useState<boolean>(false);
    const { breadCrumbSteps, navigateToNext, navigateToBreadcrumb, isAtRoot, getCurrentNavigationPath } = useHelperPaneNavigation("Inputs");

    const { field, triggerCharacters } = useFieldContext();

    // Use navigation path for completions instead of currentValue
    const navigationPath = useMemo(() => getCurrentNavigationPath(), [breadCrumbSteps]);
    const completionContext = useMemo(() =>
        navigationPath ? navigationPath + '.' : currentValue,
        [navigationPath, currentValue]
    );

    useEffect(() => {
        setIsLoading(true);
        const triggerCharacter =
            completionContext.length > 0
                ? triggerCharacters.find((char) => completionContext[completionContext.length - 1] === char)
                : undefined;

        // Only apply minimum loading time if we don't have any completions yet
        const shouldShowMinLoader = filteredCompletions.length === 0 && !showContent;
        const minLoadingTime = shouldShowMinLoader ? new Promise(resolve => setTimeout(resolve, 500)) : Promise.resolve();

        // When navigating, use length as offset to position cursor after the dot
        // When at root, use 0 to get all completions
        const offset = navigationPath ? completionContext.length : 0;

        Promise.all([
            handleRetrieveCompletions(completionContext, getPropertyFromFormField(field), offset, triggerCharacter),
            minLoadingTime
        ]).finally(() => {
            setIsLoading(false);
            setShowContent(true);
        });
    }, [targetLineRange, breadCrumbSteps, completionContext])

    const dropdownItems = useMemo(() => {
        // If we're at the root level, only show parameters
        if (isAtRoot()) {
            return filteredCompletions.filter(
                (completion) =>
                    completion.kind === "variable" &&
                    completion.labelDetails?.description?.includes("Parameter")
            );
        }

        // If we're navigating inside an object, show all fields and variables
        return filteredCompletions.filter(
            (completion) =>
                (completion.kind === "field" || completion.kind === "variable") &&
                completion.label !== "self"
        );
    }, [filteredCompletions, isAtRoot]);

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
        // Build full path from navigation
        const fullPath = navigationPath ? `${navigationPath}.${value}` : value;
        onChange(fullPath, false);
    }

    const handleInputsMoreIconClick = (value: string) => {
        navigateToNext(value, navigationPath);
    }

    const handleBreadCrumbItemClicked = (step: BreadCrumbStep) => {
        navigateToBreadcrumb(step);
    }

    const ExpandableListItems = () => {
        return (
            <>
                {
                    filteredDropDownItems.map((item) => (
                        <InputItem
                            key={item.label}
                            item={item}
                            onItemSelect={handleItemSelect}
                            onMoreIconClick={handleInputsMoreIconClick}
                        />
                    ))
                }
            </>
        )
    }

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
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "3px 8px", gap: '5px' }}>
                    <SearchBox sx={{ width: "100%" }} placeholder='Search' value={searchValue} onChange={handleSearch} />
                </div>
            )}

            <ScrollableContainer style={{ margin: '8px 0px' }}>
                {isLoading || !showContent ? (
                    <HelperPaneCustom.Loader />
                ) : (
                    <>
                        {filteredDropDownItems.length === 0 ? (
                            <EmptyItemsPlaceHolder message={searchValue ? "No inputs found for your search" : "No inputs found"} />
                        ) : (
                            <ExpandableList>
                                <ExpandableListItems />
                            </ExpandableList>
                        )}
                    </>
                )}
            </ScrollableContainer>
        </div>
    )
}
