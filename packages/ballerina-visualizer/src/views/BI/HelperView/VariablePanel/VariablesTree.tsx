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

import { TypeWithIdentifier } from "@wso2/ballerina-core";
import { PrimitiveType } from "./PrimitiveType";
import { RecordTypeTree } from "./RecordType";

interface VariableTreeProps {
    variable: TypeWithIdentifier;
    depth: number;
    handleOnSelection: (variable: string) => void;
    parentValue?: string;
    isOptional?: boolean;
}

export function VariableTree(props: VariableTreeProps) {
    const { variable, depth, handleOnSelection, parentValue, isOptional } = props

    const handleOnClick = (name: string) => {
        handleOnSelection(name);
    }

    if (variable.type.typeName === "record") {
        return (
            <RecordTypeTree
                variable={variable}
                depth={depth}
                handleOnClick={handleOnClick}
                parentValue={parentValue}
                isOptional={isOptional}
            />
        );
    } else {
        return (<PrimitiveType variable={variable} handleOnClick={handleOnClick} />);
    }
}
