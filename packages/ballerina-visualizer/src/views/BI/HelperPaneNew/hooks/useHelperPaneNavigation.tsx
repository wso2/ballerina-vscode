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

import { useState } from "react";

export type BreadCrumbStep = {
    label: string;
    replaceText: string;
    isArrayAccess?: boolean;
    arrayIndex?: number;
    fieldName?: string;
}

export const useHelperPaneNavigation = (initialLabel: string) => {
    const [breadCrumbSteps, setBreadCrumbSteps] = useState<BreadCrumbStep[]>([{
        label: initialLabel,
        replaceText: ""
    }]);

    const navigateToNext = (value: string, currentValue: string) => {
        const separator = currentValue ? '.' : '';
        const newBreadCrumSteps = [...breadCrumbSteps, {
            label: value,
            replaceText: currentValue + separator + value
        }];
        setBreadCrumbSteps(newBreadCrumSteps);
    };

    const navigateToNextArray = (value: string, currentValue: string, index: number) => {
        const separator = currentValue ? '.' : '';
        const indexedValue = `${value}[${index}]`;
        const newBreadCrumSteps = [...breadCrumbSteps, {
            label: indexedValue,
            replaceText: currentValue + separator + indexedValue,
            isArrayAccess: true,
            arrayIndex: index,
            fieldName: value
        }];
        setBreadCrumbSteps(newBreadCrumSteps);
    };

    const updateLastStepArrayIndex = (index: number) => {
        if (breadCrumbSteps.length <= 1) return;
        const steps = [...breadCrumbSteps];
        const lastStep = steps[steps.length - 1];
        if (!lastStep.isArrayAccess || !lastStep.fieldName) return;

        const parentStep = steps[steps.length - 2];
        const parentPath = parentStep.replaceText;
        const separator = parentPath ? '.' : '';
        const newReplaceText = parentPath + separator + lastStep.fieldName + '[' + index + ']';

        steps[steps.length - 1] = {
            ...lastStep,
            arrayIndex: index,
            label: lastStep.fieldName + '[' + index + ']',
            replaceText: newReplaceText
        };
        setBreadCrumbSteps(steps);
    };

    const navigateToBreadcrumb = (step: BreadCrumbStep) => {
        const index = breadCrumbSteps.findIndex(item => item.label === step.label);
        const newSteps = index !== -1 ? breadCrumbSteps.slice(0, index + 1) : breadCrumbSteps;
        setBreadCrumbSteps(newSteps);
    };

    const isAtRoot = () => breadCrumbSteps.length === 1;

    const getCurrentPath = () => {
        if (breadCrumbSteps.length === 1) return '';
        return breadCrumbSteps[breadCrumbSteps.length - 1].replaceText;
    };

    const getCurrentNavigationPath = getCurrentPath;

    return {
        breadCrumbSteps,
        navigateToNext,
        navigateToNextArray,
        updateLastStepArrayIndex,
        navigateToBreadcrumb,
        isAtRoot,
        getCurrentPath,
        getCurrentNavigationPath
    };
};
