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
import { useQuery } from '@tanstack/react-query';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { DMViewState, LinePosition } from '@wso2/ballerina-core';
import { useRef } from 'react';

export const useDataMapperModel = (
    filePath: string,
    viewState: DMViewState,
    position?: LinePosition
) => {
    const { rpcClient } = useRpcContext();
    const viewId = viewState?.viewId;
    const codedata = viewState?.codedata;

    const triggerRefresh = useRef<boolean>(false);

    const getDMModel = async () => {
        try {

            const codeDataPosition = {
                    line: codedata.lineRange.startLine.line,
                    offset: codedata.lineRange.startLine.offset
                };

            const modelParams = {
                filePath,
                codedata,
                targetField: viewId,
                position: viewState.subMappingName ? codeDataPosition : (position ??  codeDataPosition)
            };
            console.log('>>> [Data Mapper] Model Parameters:', modelParams);

            const res = await rpcClient
                .getDataMapperRpcClient()
                .getDataMapperModel(modelParams);

            if (triggerRefresh.current) {
                res.mappingsModel.triggerRefresh = true;
                triggerRefresh.current = false;
            }

            console.log('>>> [Data Mapper] Model:', res);
            return res.mappingsModel;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const {
        data: model,
        isFetching,
        isError,
        refetch
    } = useQuery({
        queryKey: ['getDMModel', codedata, viewId],
        queryFn: getDMModel,
        networkMode: 'always'
    });

    const refreshDMModel = async () => {
        triggerRefresh.current = true;
        await refetch();
    };

    const requestRefreshDMModel = () => {
        triggerRefresh.current = true;
    };

    return { model, isFetching, isError, refreshDMModel, requestRefreshDMModel };
};
