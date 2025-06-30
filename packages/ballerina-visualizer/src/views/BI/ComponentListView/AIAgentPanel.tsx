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
import React from 'react';
import { Icon } from '@wso2/ui-toolkit';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { EVENT_TYPE, MACHINE_VIEW, SCOPE } from '@wso2/ballerina-core';

import { CardGrid, PanelViewMore, Title, TitleWrapper } from './styles';
import { BodyText } from '../../styles';
import ButtonCard from '../../../components/ButtonCard';
import { OutOfScopeComponentTooltip } from './componentListUtils';

interface AIAgentPanelProps {
    scope: SCOPE;
};

export function AIAgentPanel(props: AIAgentPanelProps) {
    const { rpcClient } = useRpcContext();
    const isDisabled = props.scope && (props.scope !== SCOPE.AI_AGENT && props.scope !== SCOPE.ANY);

    const handleClick = async () => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.AIChatAgentWizard
            },
        });
    };

    return (
        <PanelViewMore disabled={isDisabled}>
            <TitleWrapper>
                <Title variant="h2">AI Agent</Title>
                <BodyText>Create an agent that you can chat with or use as an API.</BodyText>
            </TitleWrapper>
            <CardGrid>
                <ButtonCard
                    id="ai-agent-card"
                    icon={<Icon name="bi-ai-agent" />}
                    title="AI Chat Agent"
                    onClick={handleClick}
                    disabled={isDisabled}
                    tooltip={isDisabled ? OutOfScopeComponentTooltip : ""}
                />
            </CardGrid>
        </PanelViewMore>
    );
};