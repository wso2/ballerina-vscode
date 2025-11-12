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
import { Icon } from '@wso2/ui-toolkit';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { EVENT_TYPE, MACHINE_VIEW, SCOPE } from '@wso2/ballerina-core';

import { CardGrid, PanelViewMore, Title, TitleWrapper } from './styles';
import { BodyText } from '../../styles';
import ButtonCard from '../../../components/ButtonCard';
import { OutOfScopeComponentTooltip } from './componentListUtils';

interface IntegrationAPIPanelProps {
    scope: SCOPE;
};

interface ServiceModel {
    orgName: string;
    packageName: string;
    moduleName: string;
}

export function IntegrationAPIPanel(props: IntegrationAPIPanelProps) {
    const { rpcClient } = useRpcContext();
    const isDisabled = props.scope && (props.scope !== SCOPE.INTEGRATION_AS_API && props.scope !== SCOPE.ANY);

    const handleClick = async (model: ServiceModel) => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceWizard,
                artifactInfo: {
                    org: model.orgName,
                    packageName: model.packageName,
                    moduleName: model.moduleName,
                }
            },
        });
    };

    return (
        <>
            <PanelViewMore disabled={isDisabled}>
                <TitleWrapper>
                    <Title variant="h2">Integration as API</Title>
                    <BodyText>
                        Create an integration that can be exposed as an API in the specified protocol.
                    </BodyText>
                </TitleWrapper>
                <CardGrid>
                    <ButtonCard
                        id="http-service-card"
                        icon={<Icon name="bi-globe" />}
                        title="HTTP Service"
                        // description="Handle web requests and responses."
                        onClick={() => handleClick({
                            orgName: "ballerina",
                            packageName: "http",
                            moduleName: "http"
                        })}
                        disabled={isDisabled}
                        tooltip={isDisabled ? OutOfScopeComponentTooltip : ""}
                    />
                    <ButtonCard
                        id="graphql-service-card"
                        data-testid="websocket-service-card"
                        icon={<Icon name="bi-graphql" sx={{ color: "#e535ab" }} />}
                        title="GraphQL Service"
                        // description="Flexible and efficient data queries."
                        onClick={() => handleClick({
                            orgName: "ballerina",
                            packageName: "graphql",
                            moduleName: "graphql"
                        })}
                        disabled={isDisabled}
                        tooltip={isDisabled ? OutOfScopeComponentTooltip : ""}
                        isBeta
                    />
                    <ButtonCard
                        id="tcp-service-card"
                        data-testid="websocket-service-card"
                        icon={<Icon name="bi-tcp" />}
                        title="TCP Service"
                        // description="Process connection oriented messages."
                        onClick={() => handleClick({
                            orgName: "ballerina",
                            packageName: "tcp",
                            moduleName: "tcp"
                        })}
                        disabled={isDisabled}
                        tooltip={isDisabled ? OutOfScopeComponentTooltip : ""}
                        isBeta
                    />
                    {/* TODO: Add this when GRPC is working */}
                    {/* <ButtonCard
                    icon={<Icon name="bi-grpc" />}
                    title="gRPC Service"
                    description="High-performance, cross-platform communication."
                    onClick={() => handleClick("grpc")}
                /> */}
                </CardGrid>
            </PanelViewMore>
        </>
    );
};
