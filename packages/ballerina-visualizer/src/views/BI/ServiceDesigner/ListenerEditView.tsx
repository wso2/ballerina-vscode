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
import { EVENT_TYPE, ListenerModel, NodePosition, LineRange } from '@wso2/ballerina-core';
import { Typography, ProgressRing, View, ViewContent } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import ListenerConfigForm from './Forms/ListenerConfigForm';
import { LoadingContainer } from '../../styles';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { TitleBar } from '../../../components/TitleBar';

const FORM_WIDTH = 600;

const FormContainer = styled.div`
    padding-top: 15px;
    padding-bottom: 15px;
`;


const ContainerX = styled.div`
    padding: 0 20px 20px;
    max-width: 600px;
    > div:last-child {
        padding: 20px 0;
        > div:last-child {
            justify-content: flex-start;
        }
    }
`;

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
    margin: 0 20px 20px 0;
`;

const BottomMarginTextWrapper = styled.div`
    margin-top: 20px;
    margin-left: 20px;
    font-size: 15px;
    margin-bottom: 10px;
`;

const HorizontalCardContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
`;

const IconWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const ButtonWrapper = styled.div`
    max-width: 600px;
    display: flex;
    gap: 10px;
    justify-content: right;
`;


export interface ListenerEditViewProps {
    filePath: string;
    position: NodePosition;
}

export function ListenerEditView(props: ListenerEditViewProps) {
    const { filePath, position } = props;
    const { rpcClient } = useRpcContext();
    const [listenerModel, setListenerModel] = useState<ListenerModel>(undefined);

    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        const lineRange: LineRange = { startLine: { line: position.startLine, offset: position.startColumn }, endLine: { line: position.endLine, offset: position.endColumn } };
        rpcClient.getServiceDesignerRpcClient().getListenerModelFromCode({ filePath, codedata: { lineRange } }).then(res => {
            console.log("Editing Listener Model: ", res.listener)
            setListenerModel(res.listener);
        })
    }, [position]);

    const onSubmit = async (value: ListenerModel) => {
        setSaving(true);
        const res = await rpcClient.getServiceDesignerRpcClient().updateListenerSourceCode({ filePath, listener: value });
        rpcClient.getVisualizerRpcClient().goBack();
    }

    return (
        <View>
            <TopNavigationBar />
            <TitleBar title="Listener" subtitle="Configure Listener" />
            <ViewContent padding>
                {!listenerModel &&
                    <LoadingContainer>
                        <ProgressRing />
                        <Typography variant="h3" sx={{ marginTop: '16px' }}>Loading...</Typography>
                    </LoadingContainer>
                }
                {listenerModel &&
                    <Container>
                        <ListenerConfigForm listenerModel={listenerModel} onSubmit={onSubmit} formSubmitText={saving ? "Saving..." : "Save"} isSaving={saving} />
                    </Container>
                }
            </ViewContent>
        </View >


    );
};
