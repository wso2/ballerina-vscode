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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { EvalSet, EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { EvalThreadViewer } from "./EvalThreadViewer";
import { TopNavigationBar } from "../../components/TopNavigationBar";
import { Button, Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

// --- LAYOUT COMPONENTS ---

const PageWrapper = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
`;

const Container = styled.div`
    flex: 1;
    width: 100%;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    *, *::before, *::after {
        box-sizing: border-box;
    }
`;

const Header = styled.div`
    top: 0;
    padding: 16px 24px;
    position: sticky;
    background-color: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-panel-border);
    border-bottom: 1px solid var(--vscode-panel-border);
    z-index: 10;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Title = styled.h1`
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-foreground);
`;

const Subtitle = styled.p`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin: 0;
`;

const ThreadListContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-content: start;
`;

const ThreadCard = styled.div`
    padding: 16px;
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;

    &:hover {
        border-color: var(--vscode-focusBorder);
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const ThreadName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
`;

const ThreadMeta = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DeleteIconButton = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    gap: 8px;
`;

const ErrorMessage = styled.div`
    padding: 15px;
    background-color: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    color: var(--vscode-errorForeground);
    margin: 24px;
`;

interface EvalsetViewerProps {
    projectPath: string;
    filePath: string;
    content: EvalSet;
    threadId?: string;
}

export const EvalsetViewer: React.FC<EvalsetViewerProps> = ({ projectPath, filePath, content, threadId }) => {
    const { rpcClient } = useRpcContext();
    const [isAddingThread, setIsAddingThread] = useState(false);

    // If a specific thread is selected, delegate to EvalThreadViewer
    if (threadId) {
        const evalThread = content.threads.find(c => c.id === threadId);

        if (!evalThread) {
            return (
                <PageWrapper>
                    <TopNavigationBar projectPath={projectPath} />
                    <Container>
                        <ErrorMessage>
                            Thread with ID "{threadId}" not found in this evalset.
                        </ErrorMessage>
                    </Container>
                </PageWrapper>
            );
        }

        return <EvalThreadViewer projectPath={projectPath} filePath={filePath} evalSet={content} evalThread={evalThread} />;
    }

    // Handle thread creation by calling the existing VS Code command
    const handleAddThread = async () => {
        if (isAddingThread) { return; }

        setIsAddingThread(true);
        try {
            // Call the existing VS Code command that handles thread creation
            // Pass autoRefresh=true to immediately refresh the view (vs waiting for notification)
            await rpcClient.getCommonRpcClient().executeCommand({
                commands: [
                    'ballerina.createNewThread',
                    { uri: { fsPath: filePath } },
                    true // autoRefresh parameter
                ]
            });
        } catch (error) {
            console.error('Error adding thread:', error);
        } finally {
            setIsAddingThread(false);
        }
    };

    // Handle clicking on a thread card
    const handleThreadClick = (clickedThreadId: string) => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.EvalsetViewer,
                evalsetData: {
                    filePath,
                    content,
                    threadId: clickedThreadId
                }
            }
        });
    };

    // Handle deleting a thread
    const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();

        try {
            await rpcClient.getCommonRpcClient().executeCommand({
                commands: [
                    'ballerina.deleteThread',
                    {
                        parentUri: { fsPath: filePath },
                        threadId: threadId
                    },
                    true
                ]
            });
        } catch (error) {
            console.error('Error deleting thread:', error);
        }
    };

    // Render thread list view
    return (
        <PageWrapper>
            <TopNavigationBar projectPath={projectPath} />
            <Container>
                <Header>
                    <HeaderLeft>
                        <Title>{content.name}</Title>
                        <Subtitle>
                            {content.threads.length} thread{content.threads.length !== 1 ? 's' : ''}
                        </Subtitle>
                    </HeaderLeft>
                    <HeaderRight>
                        <Button
                            onClick={handleAddThread}
                            disabled={isAddingThread}
                            appearance="primary"
                        >
                            <Icon name="add" isCodicon sx={{ marginRight: "4px" }} />
                            Add Thread
                        </Button>
                    </HeaderRight>
                </Header>
                {content.threads.length === 0 ? (
                    <EmptyState>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>No threads yet</div>
                        <div style={{ fontSize: '12px' }}>Click "Add Thread" to create your first thread</div>
                    </EmptyState>
                ) : (
                    <ThreadListContainer>
                        {content.threads.map((thread) => (
                            <ThreadCard key={thread.id} onClick={() => handleThreadClick(thread.id)}>
                                <DeleteIconButton
                                    className="delete-icon"
                                    onClick={(e) => handleDeleteThread(e, thread.id)}
                                    title="Delete thread"
                                >
                                    <Icon name="bi-delete" iconSx={{ fontSize: "16px", display: "flex" }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }} />
                                </DeleteIconButton>
                                <ThreadName>{thread.id}</ThreadName>
                                <ThreadMeta>
                                    <div>{thread.traces.length} turn{thread.traces.length !== 1 ? 's' : ''}</div>
                                    {thread.created_on && (
                                        <div>Created: {new Date(thread.created_on).toLocaleDateString()}</div>
                                    )}
                                </ThreadMeta>
                            </ThreadCard>
                        ))}
                    </ThreadListContainer>
                )}
            </Container>
        </PageWrapper>
    );
};
