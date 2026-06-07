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

import React from 'react';
import { BreadCrumbStep } from '../hooks/useHelperPaneNavigation';
import { ThemeColors, Codicon } from '@wso2/ui-toolkit';

interface BreadcrumbNavigationProps {
    breadCrumbSteps: BreadCrumbStep[];
    onNavigateToBreadcrumb: (step: BreadCrumbStep) => void;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
    breadCrumbSteps,
    onNavigateToBreadcrumb
}) => {
    if (breadCrumbSteps.length <= 1) {
        return null;
    }

    // Show truncation if more than 4 items
    const maxVisibleItems = 4;
    const shouldTruncate = breadCrumbSteps.length > maxVisibleItems;
    
    const getVisibleSteps = () => {
        if (!shouldTruncate) {
            return breadCrumbSteps;
        }
        
        // Show first item, ellipsis, and last few items
        const firstItem = breadCrumbSteps[0];
        const lastItems = breadCrumbSteps.slice(-(maxVisibleItems - 2)); // -2 for first item and ellipsis
        
        return [firstItem, { label: '...', replaceText: '', isTruncated: true }, ...lastItems];
    };

    const visibleSteps = getVisibleSteps();

    const breadcrumbItemStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'background-color 0.15s ease',
        cursor: 'pointer',
        color: ThemeColors.HIGHLIGHT,
    };

    const breadcrumbItemHoverStyle = {
        backgroundColor: ThemeColors.SURFACE_DIM,
    };

    const separatorStyle = {
        display: 'flex',
        alignItems: 'center',
        margin: '0 2px',
        color: ThemeColors.ON_SURFACE,
        fontSize: '10px',
        opacity: 0.6,
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            backgroundColor: ThemeColors.SURFACE_DIM_2,
            borderRadius: '6px',
            margin: '0px 8px 4px',
            gap: '2px',
            fontSize: '12px',
        }}>
            {visibleSteps.map((step, index) => (
                <React.Fragment key={`${step.label}-${index}`}>
                    {(step as any).isTruncated ? (
                        // Ellipsis item
                        <span style={{
                            ...breadcrumbItemStyle,
                            cursor: 'default',
                            color: ThemeColors.ON_SURFACE,
                            opacity: 0.6,
                        }}>
                            ...
                        </span>
                    ) : (
                        // Regular breadcrumb item
                        <span
                            style={breadcrumbItemStyle}
                            onClick={() => onNavigateToBreadcrumb(step)}
                            onMouseEnter={(e) => {
                                Object.assign(e.currentTarget.style, breadcrumbItemHoverStyle);
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            {step.label}
                        </span>
                    )}
                    
                    {/* Show separator if not the last item */}
                    {index < visibleSteps.length - 1 && (
                        <span style={separatorStyle}>
                            <Codicon name="chevron-right" />
                        </span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
