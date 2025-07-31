import { CompletionItem } from "@wso2/ui-toolkit";

export const DEFAULT_VALUE_MAP: Record<string, string> = {
    "struct": "{}",
    "array": "[]",
    "map": "{}",
    "string": "\"\"",
    "int": "0",
    "float": "0.0",
    "boolean": "false",
    "any": "null",
}

export const isRowType = (type: CompletionItem) => {
    return type && type.kind === "struct";
}

export const isUnionType = (type: CompletionItem) => {
    return type && type.kind === "enum";
}

export const getDefaultValue = (type: CompletionItem) => {
    const typeKind = type?.kind;
    if (typeKind && typeKind === 'type-parameter') {
        return DEFAULT_VALUE_MAP[type.label] || "";
    }
}