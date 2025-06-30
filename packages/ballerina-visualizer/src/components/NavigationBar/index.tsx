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
// tslint:disable: jsx-no-multiline-js
import React, { useEffect, useMemo, useState } from "react";
import { NavButtonGroup } from "./NavButtonGroup";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { HistoryEntry, MACHINE_VIEW } from "@wso2/ballerina-core";
import { Breadcrumbs, Codicon, Typography } from "@wso2/ui-toolkit";

interface NavigationBarProps {
    showHome?: boolean
}

const NavigationContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const FnNavContainer = styled.div`
    margin-left: 7px;
`;

export function NavigationBar(props: NavigationBarProps) {

    const { rpcClient } = useRpcContext();
    const [history, setHistory] = useState<HistoryEntry[]>();

    useEffect(() => {
        rpcClient.getVisualizerRpcClient().getHistory().then(history => setHistory(history));
    }, []);

    const fromDataMapper = history && history.length > 0 && history[history.length - 1].location.view === MACHINE_VIEW.DataMapper;

    const [activeLink, links] = useMemo(() => {
        if (fromDataMapper && history[history.length - 1].dataMapperDepth < history.length) {

            const currentEntry = history[history.length - 1];
            const startIndex = history.length - 1 - currentEntry.dataMapperDepth;
            let label = currentEntry?.location.identifier;
            const selectedLink = (
                <Typography variant="body2">{label}</Typography>
            );
            const restLinks: JSX.Element[] = [];

            if (currentEntry.dataMapperDepth > 0) {
                history.slice(startIndex, history.length - 1).forEach((node, index) => {
                    const handleClick = () => {
                        rpcClient.getVisualizerRpcClient().goSelected(startIndex + index);
                    }
                    label = node?.location.identifier;
                    restLinks.push(
                        <a
                            data-index={index}
                            key={index}
                            onClick={handleClick}
                            data-testid={`dm-header-breadcrumb-${index}`}
                        >
                            <Typography variant="body2">{label}</Typography>
                        </a>
                    );
                })
            }

            return [selectedLink, restLinks];
        }
        return [undefined, undefined];
    }, [history, fromDataMapper]);

    return (
        <NavigationContainer id="nav-bar-main">
            <NavButtonGroup historyStack={history} showHome={props.showHome} />
            {fromDataMapper && (
                <FnNavContainer>
                    <Breadcrumbs
                        maxItems={3}
                        separator={<Codicon name="chevron-right" />}
                    >
                        {links}
                        {activeLink}
                    </Breadcrumbs>
                </FnNavContainer>
            )}
        </NavigationContainer>
    );
}
