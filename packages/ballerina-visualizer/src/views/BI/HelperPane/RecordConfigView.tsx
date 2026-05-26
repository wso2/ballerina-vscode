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

import { TypeField } from "@wso2/ballerina-core";

import styled from "@emotion/styled";
import { MemoizedParameterBranch } from "./RecordConstructView/ParameterBranch";

interface ConfigureViewProps {
    recordModel: TypeField[];
    onModelChange: (updatedModel: TypeField[]) => void;
}

export const LabelContainer = styled.div({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingBottom: '10px'
});

export const Description = styled.div({
    color: 'var(--vscode-list-deemphasizedForeground)',
});

const Label = styled.div<{}>`
    font-size: 14px;
    font-family: GilmerBold;
    padding-top: 10px;
    padding-bottom: 10px;
    text-wrap: nowrap;
`;

export const PanelBody = styled.div`
    height: 100vh;
`;


export function RecordConfigView(props: ConfigureViewProps) {
    const { recordModel, onModelChange } = props;

    const handleOnChange = async () => {
        onModelChange(recordModel);
    }

    return (
        <PanelBody>
            <>
                <LabelContainer>
                    <Description >{`Select fields to construct the record`}</Description>
                </LabelContainer>
                <MemoizedParameterBranch key={JSON.stringify(recordModel)} parameters={recordModel} depth={1} onChange={handleOnChange} />
            </>
        </PanelBody>
    );
}
