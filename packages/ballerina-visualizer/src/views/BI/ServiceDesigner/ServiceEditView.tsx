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
import { ServiceModel, NodePosition, LineRange, ListenerModel, EVENT_TYPE } from '@wso2/ballerina-core';
import { Typography, ProgressRing, View, ViewContent } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import ServiceConfigForm from './Forms/ServiceConfigForm';
import { LoadingContainer } from '../../styles';
import { TitleBar } from '../../../components/TitleBar';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import ListenerConfigForm from './Forms/ListenerConfigForm';

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


export interface ServiceEditViewProps {
    filePath: string;
    position: NodePosition;
    onChange?: (data: ServiceModel, filePath: string, position: NodePosition) => void;
    onDirtyChange?: (isDirty: boolean, filePath: string, position: NodePosition) => void;
    onValidityChange?: (isValid: boolean) => void;
}

export function ServiceEditView(props: ServiceEditViewProps) {
    const { filePath, position, onChange, onDirtyChange, onValidityChange } = props;
    const { rpcClient } = useRpcContext();
    const [serviceModel, setServiceModel] = useState<ServiceModel>(undefined);

    const [saving, setSaving] = useState<boolean>(false);
    const [step, setStep] = useState<number>(1);

    useEffect(() => {
        const lineRange: LineRange = { startLine: { line: position.startLine, offset: position.startColumn }, endLine: { line: position.endLine, offset: position.endColumn } };
        rpcClient.getServiceDesignerRpcClient().getServiceModelFromCode({ filePath, codedata: { lineRange } }).then(res => {
            setServiceModel(res.service);
        })
    }, [props.filePath, props.position]);

    const onSubmit = async (value: ServiceModel) => {
        setSaving(true);
        const res = await rpcClient.getServiceDesignerRpcClient().updateServiceSourceCode({ filePath, service: value });
        const updatedArtifact = res.artifacts.at(0);
        if (updatedArtifact) {
            rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: updatedArtifact.path, position: updatedArtifact.position } });
            setSaving(false);
            return;
        }
    }

    const handleServiceChange = async (data: ServiceModel) => {
        if (onChange) {
            onChange(data, filePath, position);
        }
    }

    const handleServiceDirtyChange = (isDirty: boolean) => {
        onDirtyChange?.(isDirty, filePath, position);
    }

    const handleListenerSubmit = async (value?: ListenerModel) => {
        setSaving(true);
        let listenerName;
        if (value) {
            await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({ filePath: "", listener: value });
            if (value.properties['name'].value) {
                listenerName = value.properties['name'].value;
                serviceModel.properties['listener'].value = listenerName;
                serviceModel.properties['listener'].items.push(listenerName);
                setServiceModel({ ...serviceModel, properties: { ...serviceModel.properties } });
                setSaving(false);
                setStep(1);
            }
        }
    };

    const onBack = () => {
        setStep(1);
    }

    const openListenerForm = () => {
        setStep(0);
    }

    return (
        <>
            {serviceModel && <ServiceConfigForm serviceModel={serviceModel} onSubmit={onSubmit} formSubmitText={saving ? "Saving..." : "Save"} isSaving={saving} onChange={handleServiceChange} onDirtyChange={handleServiceDirtyChange} onValidityChange={onValidityChange} />}
        </>
    );
};
