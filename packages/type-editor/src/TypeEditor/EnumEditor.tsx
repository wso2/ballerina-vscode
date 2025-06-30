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

import React, { useState, useEffect } from "react";
import { TextField, Button, Icon, Codicon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { Type, Member } from "@wso2/ballerina-core";
import { IdentifierField } from "./IdentifierField";

namespace S {
    export const Container = styled.div`
        display: flex;
        flex-direction: column;
    `;

    export const MemberRow = styled.div`
        display: flex;
        gap: 8px;
        justify-content: flex-start;
        margin-bottom: 8px;
    `;

    export const Header = styled.div`
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 0px;
        margin-bottom: 8px;
    `;

    export const SectionTitle = styled.div`
        font-size: 13px;
        font-weight: 500;
        color: var(--vscode-editor-foreground);
        margin-bottom: 4px;
    `;

    export const AddButton = styled(Button)`
        margin-top: 8px;
    `;

    export const DeleteButton = styled(Button)`
        min-width: 32px;
        height: 32px;
        padding: 0;
    `;

    export const ExpandIconButton = styled(Button)`
        padding: 4px;
        &:hover {
            background: transparent;
        }
    `;

    export const ConstantExpressionContainer = styled.div`
        display: flex;
        flex-direction: column;
        gap: 8px;
        border: 1px solid var(--vscode-welcomePage-tileBorder);
        margin-left: 25px;
        margin-bottom: 10px;
        padding: 8px;
        border-radius: 4px;
    `;

    export const ValidationMessage = styled.div`
        color: var(--vscode-errorForeground);
        font-size: 12px;
        margin-top: 8px;
    `;
}

interface EnumEditorProps {
    type: Type;
    onChange: (type: Type) => void;
    onValidationError?: (isError: boolean) => void;
}

export function EnumEditor({ type, onChange, onValidationError }: EnumEditorProps) {
    const [expandedFunctions, setExpandedFunctions] = useState<number[]>([]);
    const [notEnoughMembers, setNotEnoughMembers] = useState<boolean>(false);
    const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, boolean>>({});

    // Initialize with at least one member if none exist
    useEffect(() => {
        let shouldUpdateType = false;
        let updatedMembers: Member[] = [...(type.members || [])];

        if (!type.members || type.members.length < 1) {
            shouldUpdateType = true;

            updatedMembers.push({
                kind: "ENUM_MEMBER",
                name: "",
                type: "string",
                refs: []
            });
        }

        // Update the validation state
        setNotEnoughMembers(updatedMembers.length < 1);
        validateAllErrors(updatedMembers.length < 1);

        // Only update the type if we made changes
        if (shouldUpdateType) {
            onChange({
                ...type,
                members: updatedMembers
            });
        }
    }, [type.members?.length]);

    // Validate that there is at least one member
    const validateMemberCount = (count: number) => {
        const notEnough = count < 1;
        setNotEnoughMembers(notEnough);
        validateAllErrors(notEnough);
    };

    const onFieldValidation = (key: string | number, hasError: boolean) => {
        setFieldValidationErrors(prev => {
            const newErrors = { ...prev, [key]: hasError };
            onValidationError?.(Object.values(newErrors).some(error => error) || notEnoughMembers);
            return newErrors;
        });
    };

    // Combine all validation errors and notify parent
    const validateAllErrors = (notEnoughMembersError: boolean) => {
        const hasFieldErrors = Object.values(fieldValidationErrors).some(error => error);
        const hasAnyError = notEnoughMembersError || hasFieldErrors;
        onValidationError?.(hasAnyError);
    };

    const toggleFunctionExpand = (index: number) => {
        setExpandedFunctions(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const addMember = () => {
        const newMember: Member = {
            kind: "ENUM_MEMBER",
            name: "",
            type: "string",
            refs: []
        };

        const updatedMembers = [...type.members, newMember];
        onChange({
            ...type,
            members: updatedMembers
        });

        validateMemberCount(updatedMembers.length);
    };

    const updateMember = (index: number, name: string) => {
        const updatedMembers = [...type.members];
        updatedMembers[index] = {
            ...updatedMembers[index],
            name
        };

        onChange({
            ...type,
            members: updatedMembers
        });
    };

    const deleteMember = (index: number) => {
        const updatedMembers = type.members.filter((_, i) => i !== index);
        onChange({
            ...type,
            members: updatedMembers
        });

        validateMemberCount(updatedMembers.length);
    };

    const handleMemberDefaultValueChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedMembers = [...type.members];
        updatedMembers[index] = {
            ...updatedMembers[index],
            defaultValue: e.target.value
        };

        onChange({
            ...type,
            members: updatedMembers
        });
    };


    return (
        <S.Container>
            <S.Header>
                <S.SectionTitle>Members</S.SectionTitle>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button appearance="icon" onClick={addMember}><Codicon name="add" /></Button>
                </div>
            </S.Header>
            {type.members.map((member, index) => (
                <>
                    <S.MemberRow>
                        <S.ExpandIconButton
                            appearance="icon"
                            onClick={() => toggleFunctionExpand(index)}
                        >
                            <Codicon name={expandedFunctions.includes(index) ? "chevron-down" : "chevron-right"} />
                        </S.ExpandIconButton>
                        <div style={{ flexGrow: 1 }}>
                            <IdentifierField
                                value={member.name}
                                onChange={(value) => updateMember(index, value)}
                                placeholder="Enum member name"
                                rootType={type}
                                autoFocus={index === 0}
                                onValidationError={(hasError) => onFieldValidation(index, hasError)}
                            />
                        </div>
                        <Button
                            appearance="icon"
                            onClick={() => deleteMember(index)}
                            disabled={type.members.length <= 1}
                            tooltip={type.members.length <= 1 ? "Enum must have at least one member" : "Remove member"}

                        >
                            <Codicon
                                name="trash"
                                sx={{
                                    cursor: type.members.length <= 1 ? "not-allowed" : "pointer"
                                }}
                            />
                        </Button>
                    </S.MemberRow>
                    {expandedFunctions.includes(index) && (
                        <S.ConstantExpressionContainer>
                            <TextField
                                label='Constant Expression'
                                value={member.defaultValue}
                                onChange={(e) => handleMemberDefaultValueChange(index, e)}
                                style={{ width: '180px' }}
                            />
                        </S.ConstantExpressionContainer>
                    )}
                </>
            ))}
            {notEnoughMembers && type.members.length < 1 && (
                <S.ValidationMessage>
                    Enum type must have at least one member
                </S.ValidationMessage>
            )}
        </S.Container>
    );
} 
