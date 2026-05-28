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

import { RecordTypeField } from "@wso2/ballerina-core";
import { RefObject} from "react";
import ExpandableList from "../Components/ExpandableList";
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane";
import { ValueCreationOption } from "..";

type CreateValuePageProps = {
    fileName: string;
    currentValue: string;
    onChange: (value: string, isRecordConfigureChange: boolean) => void;
    selectedType?: string | string[];
    recordTypeField?: RecordTypeField;
    anchorRef: RefObject<HTMLDivElement>;
    valueCreationOptions?: ValueCreationOption[];
}

export const CreateValue = (props: CreateValuePageProps) => {
    const { fileName, currentValue, onChange, selectedType, recordTypeField, valueCreationOptions } = props;

    return (
        (recordTypeField) ?
            <>
            </>
            : <NonRecordCreateValue
                fileName={fileName}
                currentValue={currentValue}
                onChange={onChange}
                selectedType={selectedType}
                valueCreationOptions={valueCreationOptions}
                {...props}
            />
    )
}

const isSelectedTypeContainsType = (selectedType: string | string[], searchType: string) => {
    if (Array.isArray(selectedType)) {
        return selectedType.some(type => type.includes(searchType));
    }
    const unionTypes = selectedType.split("|").map(type => type.trim());
    return unionTypes.includes(searchType);
}

const NonRecordCreateValue = (props: CreateValuePageProps) => {
    const { selectedType, onChange, valueCreationOptions } = props;

    const handleValueSelect = (value: string) => {
        onChange(value, false);
    }

    return (
        <div style={{ padding: '8px 0px' }}>
            {valueCreationOptions
                .filter(option => option.typeCheck === null || isSelectedTypeContainsType(selectedType, option.typeCheck))
                .map((option, index) => (
                    <ExpandableList key={(option.typeCheck || 'default') + index}>
                        <SlidingPaneNavContainer onClick={() => { handleValueSelect(option.value) }}>
                            <ExpandableList.Item sx={{ width: "100%" }}>
                                {option.label}
                            </ExpandableList.Item>
                        </SlidingPaneNavContainer>
                    </ExpandableList>
                ))
            }
        </div>
    );
}
