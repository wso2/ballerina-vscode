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
import { ExpressionProperty, LineRange } from "@wso2/ballerina-core"
import { Codicon, CompletionItem, getIcon, HelperPaneCustom, SearchBox, ThemeColors, Tooltip, Typography } from "@wso2/ui-toolkit"
import { useEffect, useMemo, useState } from "react"
import { getPropertyFromFormField, useFieldContext } from "@wso2/ballerina-side-panel"
import { ScrollableContainer } from "../Components/ScrollableContainer"
import styled from "@emotion/styled"

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
                <InputsMoreIconContainer style={{ height: "10px" }} onClick={(event) => {
                    event.stopPropagation();
                    onMoreIconClick(item.label);
                }}>
                    <Tooltip content={item.description} position="top">
                        <VariableTypeIndicator >
                            {item.description}
                        </VariableTypeIndicator>
                    </Tooltip>
                    <Codicon name="chevron-right" />
                </InputsMoreIconContainer>}
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

const InputsMoreIconContainer = styled.div`
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

export const Inputs = (props: InputsPageProps) => {
    const { targetLineRange, onChange, filteredCompletions, currentValue, handleRetrieveCompletions } = props;
    const [searchValue, setSearchValue] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [breadCrumbSteps, setBreadCrumbSteps] = useState<BreadCrumbStep[]>([{
        label: "Inputs",
        replaceText: ""
    }]);

    const { field, triggerCharacters } = useFieldContext();

    useEffect(() => {
        const triggerCharacter =
            currentValue.length > 0
                ? triggerCharacters.find((char) => currentValue[currentValue.length - 1] === char)
                : undefined;

        handleRetrieveCompletions(currentValue, getPropertyFromFormField(field), 0, triggerCharacter);
    }, [targetLineRange])

    console.log(">>> Inputs filteredCompletions: ", filteredCompletions);
    const dropdownItems = useMemo(() => {
        return filteredCompletions.filter(
            (completion) =>
            completion.kind === "variable" &&
            completion.labelDetails?.description?.includes("Parameter")
        );
    }, [filteredCompletions]);

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

    const handleInputsMoreIconClick = (value: string) => {
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
        </div>
    )
}
