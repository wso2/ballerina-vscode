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

import React from "react";

import { Dropdown, OptionProps } from "@wso2/ui-toolkit";

export enum OperationTypes {
    Queries = "Queries",
    Mutations = "Mutations",
    Subscriptions = "Subscriptions",
    All_Operations = "All Operations"
}

interface TypeFilterProps {
    updateFilter: (type: OperationTypes) => void;
    isFilterDisabled: boolean;
}


export function TypeFilter(props: TypeFilterProps) {
    const { updateFilter, isFilterDisabled } = props;
    const [type, setType] = React.useState<OperationTypes>(OperationTypes.All_Operations);

    const handleChange = (value: string) => {
        setType(value as OperationTypes);
        updateFilter(value as OperationTypes);
    };

    const dropDownItems: OptionProps[] = [
        { id: "All Operations", content: "All Operations", value: OperationTypes.All_Operations },
        { id: "Queries", content: "Queries", value: OperationTypes.Queries },
        { id: "Mutations", content: "Mutations", value: OperationTypes.Mutations },
        { id: "Subscriptions", content: "Subscriptions", value: OperationTypes.Subscriptions }
    ];

    return (
        <Dropdown
            id={`operation-filter`}
            label="Operation Type"
            value={type}
            onValueChange={handleChange}
            items={dropDownItems}
        />
    );
}
