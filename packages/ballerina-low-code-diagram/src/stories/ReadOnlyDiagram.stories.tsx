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
import React, { useEffect, useState } from 'react';

// tslint:disable-next-line:no-submodule-imports
import { Story } from '@storybook/react/types-6-0';
import { FunctionDefinition, ModulePart, STKindChecker } from '@wso2/syntax-tree';

import { Function } from '../Components/RenderingComponents/Function';
import { ReadOnlyDiagram } from '../ReadOnlyDiagram/readOnlyDiagram';

import { fetchSyntaxTree, getSourceRoot } from './story-utils';

export default {
    title: 'Diagram/ReadOnlyDiagram',
    component: Function,
};

const fileName: string = "sample1.bal";

const Template: Story<{ f1: string }> = (args: { f1: string }) => {

    const [st, setSt] = useState<ModulePart>(undefined);

    useEffect(() => {
        const filePath = `${getSourceRoot() + "stories/data/" + fileName}`;
        async function setSyntaxTree() {
            const syntaxTree = await fetchSyntaxTree(filePath) as ModulePart;
            setSt(syntaxTree);
        }
        setSyntaxTree();
    }, []);

    if (!st) {
        return <></>;
    }

    const functionST: FunctionDefinition = st && STKindChecker.isFunctionDefinition(st.members[0]) && st.members[0];

    return st &&
        // tslint:disable-next-line: jsx-wrap-multiline
        <>
            <ReadOnlyDiagram model={functionST} />
        </>;
}

export const ReadOnlyDiagramComponent = Template.bind({});
ReadOnlyDiagramComponent.args = {
    f1: ""
};
