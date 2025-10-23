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

import { Codicon, DropdownButton, Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

const ButtonText = styled.span`
    @media (max-width: 768px) {
        display: none;
    }
    width: 100%;
`;

interface AddServiceElementDropdownProps {
    buttonTitle: string;
    toolTip?: string;
    defaultOption?: string;
    onOptionChange: (option: string) => void;
    options: DropdownOptionProps[];
}


export function AddServiceElementDropdown(props: AddServiceElementDropdownProps) {
    const { buttonTitle, toolTip, defaultOption, onOptionChange, options } = props;
    const dropdownOptions = options.map((option) => (
        {
            content: <DropdownOption
                title={option.title}
                description={option.description}
            />,
            value: option.value,
        }
    ));

    return (
        <div style={{ position: 'relative', zIndex: 1000 }}>
            <DropdownButton
                buttonContent={
                    <>
                        <ButtonText>{buttonTitle}</ButtonText>
                    </>
                }
                selecteOption={""}
                tooltip={toolTip ?? "Add Functions or Handlers"}
                dropDownAlign="bottom"
                buttonSx={{
                    appearance: 'none',
                    height: '28px',
                    minHeight: '28px',
                    cursor: 'default',
                    pointerEvents: 'none'
                }}
                optionButtonSx={{
                    borderLeft: "none",
                    height: '28px',
                    minHeight: '28px'
                }}
                dropdownSx={{
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--vscode-dropdown-border)',
                    backgroundColor: 'var(--vscode-dropdown-background)',
                    minWidth: '280px',
                    position: 'absolute',
                    right: '0',
                    left: 'auto'
                }}
                onOptionChange={onOptionChange}
                onClick={() => { }}
                options={dropdownOptions}
            />
        </div>
    );
}

export interface DropdownOptionProps {
    title: string;
    description: string;
    value?: string;
}

function DropdownOption({ title, description }: DropdownOptionProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 8px 8px' }}>
            <div>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{title}</Typography>
                <Typography variant="body3" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                    {description}
                </Typography>
            </div>
        </div>
    );
}
