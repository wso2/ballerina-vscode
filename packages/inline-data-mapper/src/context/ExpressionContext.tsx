/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
*
* This software is the property of WSO2 LLC. and its suppliers, if any.
* Dissemination of any information or reproduction of any material contained
* herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
* You may not alter or remove any copyright or other notice from copies of this content.
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
