import React, { useState } from 'react';
import { Button, CheckBox, Codicon } from '@wso2/ui-toolkit';
import { Type } from '@wso2/ballerina-core';

interface AdvancedOptionsProps {
    type: Type;
    onChange: (type: Type) => void;
}

export function AdvancedOptions({ type, onChange }: AdvancedOptionsProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    return (
        <div>
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', marginBottom: '5px', cursor: 'pointer' }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Button
                    appearance='icon'
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    <Codicon name={isExpanded ? "chevron-up" : "chevron-down"} />
                </Button>
                <span>Advanced Options</span>
            </div>
            {isExpanded && (
                <CheckBox
                    sx={{ border: 'none', padding: '5px' }}
                    label="Allow Additional Fields"
                    checked={type?.allowAdditionalFields === true}
                    onChange={(checked: boolean) => {
                        onChange({ ...type, allowAdditionalFields: checked });
                    }}
                />
            )}
        </div>
    );
}
