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
import styled from '@emotion/styled';
import { LoadingRing } from "./components/Loader";
import AIPanel from "./views/AIPanel/AIPanel";
import { AgentChat } from "./views/AgentChatPanel/AgentChat";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { Global, css } from '@emotion/react';

const ProgressRing = styled(VSCodeProgressRing)`
    height: 50px;
    width: 50px;
    margin: 1.5rem;
`;

const LoadingContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    width: 100%;
    padding-top: 30vh;
    text-align: center;
    max-width: 500px;
    margin: 0 auto;
    animation: fadeIn 1s ease-in-out;
`;

const LoadingTitle = styled.h1`
    color: var(--vscode-foreground);
    font-size: 1.5em;
    font-weight: 400;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: normal;
`;

const LoadingSubtitle = styled.p`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    margin: 0.5rem 0 2rem 0;
    opacity: 0.8;
`;

const LoadingText = styled.div`
    color: var(--vscode-foreground);
    font-size: 13px;
    font-weight: 500;
`;

const globalStyles = css`
    @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
    }
    .loading-dots::after {
        content: '';
        animation: dots 1.5s infinite;
    }
    @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
    }
`;

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
        case typeof state === 'object' && 'viewActive' in state && state.viewActive === "resolveMissingDependencies":
            return <PullingDependenciesView />; 
        default:
            return <LanguageServerLoadingView />;
    }
});

const LanguageServerLoadingView = () => {
    return (
        <div style={{
            backgroundColor: 'var(--vscode-editor-background)',
            height: '100vh',
            width: '100%',
            display: 'flex',
            fontFamily: 'var(--vscode-font-family)'
        }}>
            <Global styles={globalStyles} />
            <LoadingContent>
                <ProgressRing />
                <LoadingTitle>
                    Activating Language Server
                </LoadingTitle>
                <LoadingSubtitle>
                    Preparing your Ballerina development environment
                </LoadingSubtitle>
                <LoadingText>
                    <span className="loading-dots">Initializing</span>
                </LoadingText>
            </LoadingContent>
        </div>
    );
};

const PullingDependenciesView = () => {
    return (
        <div style={{
            backgroundColor: 'var(--vscode-editor-background)',
            height: '100vh',
            width: '100%',
            display: 'flex',
            fontFamily: 'var(--vscode-font-family)'
        }}>
            <Global styles={globalStyles} />
            <LoadingContent>
                <ProgressRing />
                <LoadingTitle>
                    Pulling Dependencies
                </LoadingTitle>
                <LoadingSubtitle>
                    Fetching required modules for your project
                </LoadingSubtitle>
                <LoadingText>
                    <span className="loading-dots">Pulling</span>
                </LoadingText>
            </LoadingContent>
        </div>
    );
};
