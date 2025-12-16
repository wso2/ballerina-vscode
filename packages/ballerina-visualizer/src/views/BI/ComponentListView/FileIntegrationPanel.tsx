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
import { EVENT_TYPE, MACHINE_VIEW, SCOPE, ServiceModel, TriggerModelsResponse } from '@wso2/ballerina-core';

import { CardGrid, PanelViewMore, Title, TitleWrapper } from './styles';
import { BodyText } from '../../styles';
import ButtonCard from '../../../components/ButtonCard';
import { OutOfScopeComponentTooltip } from './componentListUtils';
import { RelativeLoader } from '../../../components/RelativeLoader';

interface FileIntegrationPanelProps {
    scope: SCOPE;
    triggers: TriggerModelsResponse;
};

export function FileIntegrationPanel(props: FileIntegrationPanelProps) {
    const { rpcClient } = useRpcContext();

    const isDisabled = props.scope && (props.scope !== SCOPE.FILE_INTEGRATION && props.scope !== SCOPE.ANY);

    const handleOnSelect = async (model: ServiceModel) => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceWizard,
                artifactInfo: {
                    org: model.orgName,
                    packageName: model.packageName,
                    moduleName: model.moduleName,
                    version: model.version
                }
            },
        });
    };

    return (
        <PanelViewMore disabled={isDisabled}>
            <TitleWrapper>
                <Title variant="h2">File Integration</Title>
                <BodyText>Create an integration that can be triggered by the availability of files in a location.</BodyText>
            </TitleWrapper>
            <CardGrid>
                {props.triggers.local.length === 0 && <RelativeLoader />}
                {props.triggers.local
                    .filter((t) => t.type === "file")
                    .map((item, index) => {
                        return (
                            <ButtonCard
                                id={`trigger-${item.moduleName}`}
                                key={item.id}
                                title={item.name}
                                icon={getFileIntegrationIcon(item)}
                                onClick={() => {
                                    handleOnSelect(item);
                                }}
                                disabled={isDisabled}
                                tooltip={isDisabled ? OutOfScopeComponentTooltip : ""}
                            />
                        );
                    })}
            </CardGrid>
        </PanelViewMore>
    );
};

// TODO: This should be removed once the new icons are added to the BE API.
export function getFileIntegrationIcon(item: ServiceModel) {
    return getCustomFileIntegrationIcon(item.moduleName) || <img src={item.icon} alt={item.name} style={{ width: "38px" }} />;
}

// INFO: This is a temporary function to get the custom icon for the file integration triggers.
// TODO: This should be removed once the new icons are added to the BE API.
export function getCustomFileIntegrationIcon(type: string) {
    switch (type) {
        case "ftp":
            return <Icon name="bi-ftp" />;
        case "file":
            return <Icon name="bi-file" />;
        default:
            return null;
    }
}
