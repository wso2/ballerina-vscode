import { CompletionItem } from "@wso2/ui-toolkit";

export const DEFAULT_VALUE_MAP: Record<string, string> = {
    "struct": "{}",
    "array": "[]",
    "map": "{}",
    "int": "0",
    "float": "0.0",
    "boolean": "false",
    "any": "null",
}

export const isRowType = (type: string | string[]) => {
    return type && type === "struct";
}

export const isUnionType = (type: string) => {
    return type && type === "enum";
}

export const getDefaultValue = (type: string) => {
    //TODO: handle this using API
     return DEFAULT_VALUE_MAP[type] || "";
}