// tslint:disable: jsx-no-lambda jsx-no-multiline-js
import React, { useEffect, useState } from "react";

import { Completion } from "@wso2/ballerina-core";
import { AutoComplete, ProgressIndicator } from "@wso2/ui-toolkit";

export interface TypeBrowserProps {
    type?: string;
    onChange: (newType: string) => void;
    isLoading: boolean;
    recordCompletions: CompletionResponseWithModule[];
}

export interface CompletionResponseWithModule extends Completion {
    module?: string;
}

export function TypeBrowser(props: TypeBrowserProps) {
    const { type, onChange, isLoading, recordCompletions } = props;
    const [selectedTypeStr, setSelectedTypeStr] = useState(type?.split(':')?.pop() || '')

    useEffect(() => {
        setSelectedTypeStr(type?.split(':')?.pop() || '')
    }, [type])


    return (
        <>
            <AutoComplete
                identifier="type-select-dropdown"
                key={`type-select-${isLoading.toString()}`}
                data-testid='type-select-dropdown'
                items={recordCompletions.map(
                    item => item?.module ? `${item.module}:${item.insertText}` : item?.insertText
                )}
                value={selectedTypeStr}
                onValueChange={onChange}
                borderBox={true}
            />
            {isLoading && <ProgressIndicator data-testid={'type-select-linear-progress'} />}
        </>
    );
}

