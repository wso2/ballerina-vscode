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
import { Icon } from '@wso2/ui-toolkit';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { DIRECTORY_MAP, EVENT_TYPE, MACHINE_VIEW, SCOPE } from '@wso2/ballerina-core';

import { CardGrid, PanelViewMore, Title, TitleWrapper } from './styles';
import { BodyText } from '../../styles';
import ButtonCard from '../../../components/ButtonCard';
import { AutomationAlreadyExistsTooltip, OutOfScopeComponentTooltip } from './componentListUtils';

interface AutomationPanelProps {
    scope: SCOPE;
};

export function AutomationPanel(props: AutomationPanelProps) {
    const [automationExists, setAutomationExists] = useState(false);
    const { rpcClient } = useRpcContext();

    useEffect(() => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                setAutomationExists(res.directoryMap[DIRECTORY_MAP.AUTOMATION].length > 0);
            });
    }, []);

    const outOfScope = props.scope && (props.scope !== SCOPE.AUTOMATION && props.scope !== SCOPE.ANY);
    const isDisabled = outOfScope || automationExists;

    const tooltip = outOfScope
        ? OutOfScopeComponentTooltip
        : automationExists
            ? AutomationAlreadyExistsTooltip
            : "";

    const handleClick = async () => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIMainFunctionForm,
            },
        });
    };

    return (
        <PanelViewMore disabled={isDisabled}>
            <TitleWrapper>
                <Title variant="h2">Automation</Title>
                <BodyText>Create an automation that can be invoked periodically or manually.</BodyText>
            </TitleWrapper>
            <CardGrid>
                <ButtonCard
                    id="automation"
                    icon={<Icon name="bi-task" />}
                    title="Automation"
                    onClick={handleClick}
                    disabled={isDisabled}
                    tooltip={tooltip}
                />
            </CardGrid>
        </PanelViewMore>
    );
};
