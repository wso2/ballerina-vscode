/**
 * Following is a parser written to parse the type string into a Type object.
 * 
 * The type can be one of the following:
 * 1. <identifier>
 * 2. <identifier>[]
 * 3. <identifier>?
 * 4. <identifier>|<identifier> (union type)
 * 
 * or it can be a union of the above types.
 * 
 * The parseType function will return a Type object and a list of references.
 * 
 */

import { Type } from '@wso2/ballerina-core';

//@ts-ignore
export const parseType = (type: string): string | Type => {
    // Remove any whitespace
    type = type.trim();

    // Handle empty string
    if (!type) {
        return '';
    }

    // Split union types
    if (type.includes('|')) {
        const types = type.split('|').map(t => t.trim());
        return {
            "editable": false,
            //@ts-ignore
            "codedata": {
                "node": "UNION"
            },
            "metadata": {
                "label": '',
                "description": ""
            },
            "name": "" ,
            "properties": {},
            "members":
                types.map(t => parseType(t)).map(t => {
                    if (typeof t === 'string') {
                        return {
                            "kind": "TYPE",
                            "refs": [t],
                            "type": t,
                            "name": t
                        }
                    } else {
                        return {
                            "kind": "TYPE",
                            "refs": [t.name],
                            "type": t,
                            "name": t.name
                        }
                    }
                })

        }
    }

    // Handle array types
    if (type.endsWith('[]')) {
        const baseType = type.slice(0, -2);
        return {
            "editable": false,
            //@ts-ignore
            "codedata": {
                "node": "ARRAY"
            },
            "metadata": {
                "label": '',
                "description": ""
            },
            "name": "" ,
            "properties": {},
            "members": [
                {
                    "kind": "TYPE",
                    "refs": [
                        baseType
                    ],
                    "type": baseType,
                    "name": baseType
                }
            ]
        }
    }

    // Handle optional types
    // if (type.endsWith('?')) {
    //     const baseType = type.slice(0, -1);
    //     return {
    //         "editable": false,
    //         //@ts-ignore
    //         "codedata": {
    //             "node": "UNION"
    //         },
    //         "members": [
    //             {
    //                 "kind": "TYPE",
    //                 "refs": [],
    //                 "type": "()",
    //                 "name": "()"
    //             },
    //             {
    //                 "kind": "TYPE",
    //                 "refs": [
    //                     baseType
    //                 ],
    //                 "type": baseType,
    //                 "name": baseType
    //             }
    //         ]
    //     };
    //}

    // Base case: simple identifier
    return type;
};


export const typeToSource = (type: string | Type): string => {

    if (typeof type === 'string') {
        return type;
    }

    if (type.codedata.node === 'UNION') {
        const typeString = type.members.reverse().map(m => typeToSource(m.type)).join(' | ');
        // Convert union with () to optional type notation, handling different orderings
        const optionalTypeRegex = /^\(\)\|(.+)$|^(.+)\|\(\)$/;
        const match = typeString.replace(/\s+/g, '').match(optionalTypeRegex);
        if (match) {
            // match[1] or match[2] will contain the type (whichever group matched)
            return (match[1] || match[2]) + '?';
        }
        return typeString;
    }

    if (type.codedata.node === 'ARRAY') {
        return typeToSource(type.members[0].type) + '[]';
    }

    return type.codedata.node;
};

export const defaultAnonymousRecordType = {
    "editable": false,
    "codedata": {
        "node": "RECORD"
    },
    "properties": {
    },
    "members": [
        {
            "kind": "FIELD",
            //@ts-ignore
            "refs": [],
            "type": "string",
            "name": "name",
            "docs": ""
        }
    ],
    //@ts-ignore
    "includes": []
}

// Add validation function
export const isValidBallerinaIdentifier = (name: string): boolean => {
    // Ballerina identifiers must start with a letter or underscore
    // and can contain letters, digits, and underscores
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return name.length > 0 && regex.test(name);
};
