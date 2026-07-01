/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { Icon } from '@wso2/ui-toolkit';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/ballerina-core';

import { CardGrid, PanelViewMore, Title, TitleWrapper } from './styles';
import { BodyText } from '../../styles';
import ButtonCard from '../../../components/ButtonCard';

export function WorkflowPanel() {
    const { rpcClient } = useRpcContext();

    const handleClick = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWorkflowForm,
            },
        });
    };

    return (
        <PanelViewMore>
            <TitleWrapper>
                <Title variant="h2">Workflow</Title>
                <BodyText>Create a workflow integration.</BodyText>
            </TitleWrapper>
            <CardGrid>
                <ButtonCard
                    id="workflow"
                    icon={<Icon name="bi-workflow" />}
                    title="Workflow"
                    onClick={handleClick}
                />
            </CardGrid>
        </PanelViewMore>
    );
}
