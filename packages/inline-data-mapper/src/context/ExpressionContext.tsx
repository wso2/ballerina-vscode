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
/* eslint-disable react-refresh/only-export-components */

import React, { createContext, FC, PropsWithChildren, useContext } from 'react';
import { ExpressionBarProps } from '..';

const defaultState: ExpressionBarProps = {
    completions: [],
    triggerCompletions: () => {},
    onCompletionSelect: () => {},
    onSave: () => Promise.resolve(),
    onCancel: () => {}
};
export const Context = createContext<ExpressionBarProps>(defaultState);

export const ExpressionProvider: FC<PropsWithChildren<ExpressionBarProps>> = (props) => {
    const { children, ...restProps } = props;

    return <Context.Provider value={restProps}>{children}</Context.Provider>;
};

export const useExpressionContext = () => useContext(Context);
