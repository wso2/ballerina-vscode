/* eslint-disable @typescript-eslint/no-explicit-any */
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
import React from "react";

interface CtrlClickWrapperProps {
    onClick: () => void;
}

// Wrapper to capture ctrl click action of children and run an action that's passed through props
export const CtrlClickWrapper = (props: React.PropsWithChildren<CtrlClickWrapperProps>) => {
    const { children, onClick } = props;
    const handleClick = (e: any) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }
    };

    const mappedChildren = React.Children.map(children, (child: any) => {
        return React.cloneElement(child as React.ReactElement, {
            onClick: handleClick
        });
    });

    return (
        <>
            {mappedChildren}
        </>
    );
}
