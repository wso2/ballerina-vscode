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

import React, { useEffect } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { AIMachineStateValue, MachineStateValue } from "@wso2/ballerina-core";
import MainPanel from "./MainPanel";
import { LoadingRing } from "./components/Loader";
import AIPanel from "./views/AIPanel/AIPanel";
import { AgentChat } from "./views/AgentChatPanel/AgentChat";

const MODES = {
    VISUALIZER: "visualizer",
    AI: "ai",
    RUNTIME_SERVICES: "runtime-services",
    AGENT_CHAT: "agent-chat"
};

export function Visualizer({ mode }: { mode: string }) {
    const { rpcClient } = useRpcContext();
    const [state, setState] = React.useState<MachineStateValue>('initialize');
    const [aiState, setAIState] = React.useState<AIMachineStateValue>('Initialize');

    if (mode === MODES.VISUALIZER) {
        rpcClient?.onStateChanged((newState: MachineStateValue) => {
            setState(newState);
        });
    }

    if (mode === MODES.AI) {
        rpcClient?.onAIPanelStateChanged((newState: AIMachineStateValue) => {
            setAIState(newState);
        });
    }

    useEffect(() => {
        if (mode === MODES.VISUALIZER) {
            rpcClient.webviewReady();
        }
    }, []);

    return (
        <>
            {(() => {
                switch (mode) {
                    case MODES.VISUALIZER:
                        return <VisualizerComponent state={state} />
                    case MODES.AI:
                        return <AIPanel state={aiState} />  
                    case MODES.AGENT_CHAT:
                        return <AgentChat />
                }
            })()}
        </>
    );
};

const VisualizerComponent = React.memo(({ state }: { state: MachineStateValue }) => {
    switch (true) {
        case typeof state === 'object' && 'viewActive' in state && state.viewActive === "viewReady":
            return <MainPanel />;
        default:
            return <LoadingRing />;
    }
});
