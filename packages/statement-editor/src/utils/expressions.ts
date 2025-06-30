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

import { ModelType } from "./statement-editor-viewstate";

export interface Expression {
    name: string;
    template: string;
    example: string;
    values?: string;
    symbol?: string;
}


export interface ExpressionGroup {
    name: string;
    expressions: Expression[];
    relatedModelType: ModelType;
}

export const EXPR_PLACEHOLDER = "EXPRESSION";
export const FUNCTION_CALL_PLACEHOLDER = "FUNCTION_CALL";
export const STMT_PLACEHOLDER = "STATEMENT";
export const TYPE_DESC_PLACEHOLDER = "TYPE_DESCRIPTOR";
export const BINDING_PATTERN_PLACEHOLDER = "BINDING_PATTERN";
export const DEFAULT_INTERMEDIATE_CLAUSE_PLACEHOLDER = "DEFAULT_INTERMEDIATE_CLAUSE";
export const PARAMETER_PLACEHOLDER = "PARAMETER";
export const CONF_NAME_PLACEHOLDER = "CONF_NAME"
/* tslint:disable-next-line */
export const SELECTED_EXPRESSION = "${SELECTED_EXPRESSION}";

// Copied from Ballerina Spec 2022R1
// 6. Expressions
//     6.1 Expression evaluation
//     6.2 Static typing of expressions
//         6.2.1 Lax static typing
//         6.2.2 Contextually expected type
//         6.2.3 Precise and broad types
//         6.2.4 Singleton typing
//         6.2.5 Nil lifting
//         6.2.6 Isolated expressions
//     6.3 Casting and conversion
//     6.4 Constant expressions
//     6.5 Literals
//     6.6 Template expressions
//         6.6.1 String template expression
//         6.6.2 XML template expression
//         6.6.3 Raw template expression
const templates: ExpressionGroup = {
    name: "Templates",
    expressions: [
        {
            name: "String Template",
            template: "string `value`",
            example: "string `value`"
        }, {
            name: "XML Template",
            template: "xml `value`",
            example: "xml `value`"
        }, {
            name: "Raw Template",
            template: "`value`",
            example: "`value`"
        }, {
            name: "Regex Template",
            template: "re `value`",
            example: "re `value`"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

// 6.14 Member access expression
export const memberAccess : ExpressionGroup = {
    name: "Member Access",
    expressions: [
        {
            name: "Member Access",
            template: `${SELECTED_EXPRESSION}[${EXPR_PLACEHOLDER}]`,
            example: "Es[Ex]",
            symbol: "Es[Ex]"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

//     6.7 Structural constructors
//         6.7.1 List constructor
//         6.7.2 Mapping constructor
//         6.7.3 Table constructor
export const structuralConstructors: ExpressionGroup = {
    name: "Structural Constructors",
    expressions: [
        {
            name: "List",
            template: `[ ${SELECTED_EXPRESSION} ]`,
            example: "[ Es ]",
            symbol: "[Es]"
        }, {
            name: "Mapping",
            template: ` { key: ${EXPR_PLACEHOLDER} }`,
            example: "{ key : value }",
            symbol: "{}"
        }, {
            name: "Table",
            template: ` table [ { key: value } ]`,
            example: "table [ { key: value } ]",
            symbol: "table[{}]"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

export const listBindingPattern: ExpressionGroup = {
    name: "List Binding Pattern",
    expressions: [
        {
            name: "List Binding",
            template: `[ ${SELECTED_EXPRESSION}, ${EXPR_PLACEHOLDER} ]`,
            example: "[ Es, Ex ]",
            symbol: "[Es, Ex]"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

//     6.8 Object construction
//         6.8.1 Object constructor
//             6.8.1.1 Fields
//             6.8.1.2 Methods
//             6.8.1.3 Resources
//             6.8.1.4 Initialization
//         6.8.2 New expression
//     6.9 Variable reference expression
//     6.10 Field access expression
//     6.11 Optional field access expression
//     6.12 XML attribute access expression
//     6.13 Annotation access expression
//     6.14 Member access expression
//     6.15 Function call expression
//     6.16 Method call expression
//     6.17 Error constructor
//     6.18 Anonymous function expression
const anonymousFunction: ExpressionGroup = {
    name: "Anonymous Functions",
    expressions: [
        {
            name: "Implicit Anonymous Function",
            template: `() => ${EXPR_PLACEHOLDER}`,
            example: "() => Es"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.19 Let expression
//     6.21 Typeof expression
const typeofEx: ExpressionGroup = {
    name: "Typeof",
    expressions: [
        {
            name: "Typeof",
            template: `typeof ${SELECTED_EXPRESSION}`,
            example: "typeof Es"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.20 Type cast expression
const typeCastEx: ExpressionGroup = {
    name: "Type Cast",
    expressions: [
        {
            name: "Type Cast",
            template: `<${TYPE_DESC_PLACEHOLDER}>${SELECTED_EXPRESSION}`,
            example: "<type>Es"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.22 Unary expression
//         6.22.1 Unary numeric expression
//         6.22.2 Unary logical expression
const unary: ExpressionGroup = {
    name: "Unary",
    expressions: [
        {
            name: "Unary +",
            template: `+ ${SELECTED_EXPRESSION}`,
            example: "+ Es"
        }, {
            name: "Unary -",
            template: `- ${SELECTED_EXPRESSION}`,
            example: "- Es"
        }, {
            name: "Unary ~",
            template: `~ ${SELECTED_EXPRESSION}`,
            example: "~ Es"
        }, {
            name: "Unary Logical",
            template: `! ${SELECTED_EXPRESSION}`,
            example: "! Es"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.24 Additive expression
//     6.23 Multiplicative expression
export const operators: ExpressionGroup = {
    name: "Arithmetic",
    expressions: [
        {
            name: "Add",
            template: ` ${SELECTED_EXPRESSION} + ${EXPR_PLACEHOLDER}`,
            example: "Es + Ex",
            symbol: "+"
        }, {
            name: "Subtract",
            template: ` ${SELECTED_EXPRESSION} - ${EXPR_PLACEHOLDER}`,
            example: "Es - Ex",
            symbol: "-"
        }, {
            name: "Multiply",
            template: ` ${SELECTED_EXPRESSION} * ${EXPR_PLACEHOLDER}`,
            example: "Es * Ex",
            symbol: "*"
        }, {
            name: "Divide",
            template: ` ${SELECTED_EXPRESSION} / ${EXPR_PLACEHOLDER}`,
            example: "Es / Ex",
            symbol: "/"
        }, {
            name: "Modules",
            template: ` ${SELECTED_EXPRESSION} % ${EXPR_PLACEHOLDER}`,
            example: "Es % Ex",
            symbol: "%"
        },
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.25 Shift expression
const shift: ExpressionGroup = {
    name: "Shift",
    expressions: [
        {
            name: "Left Shift",
            template: ` ${SELECTED_EXPRESSION} << ${EXPR_PLACEHOLDER}`,
            example: "Es << Ex"
        }, {
            name: "Signed Right Shift",
            template: ` ${SELECTED_EXPRESSION} >> ${EXPR_PLACEHOLDER}`,
            example: "Es >> Ex"
        }, {
            name: "Right Shift",
            template: ` ${SELECTED_EXPRESSION} >>> ${EXPR_PLACEHOLDER}`,
            example: "Es >>> Ex"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.26 Range expression
export const range: ExpressionGroup = {
    name: "Range",
    expressions: [
        {
            name: "Range less than or equal",
            template: ` ${SELECTED_EXPRESSION} ... ${EXPR_PLACEHOLDER}`,
            example: "Es ... Ex",
            symbol: "..."
        }, {
            name: "Range less than ",
            template: ` ${SELECTED_EXPRESSION} ..< ${EXPR_PLACEHOLDER}`,
            example: "Es ..< Ex",
            symbol: "..<"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.26 Range expression
const concurrency: ExpressionGroup = {
    name: "Concurrency",
    expressions: [
        {
            name: "Wait for a worker's return",
            template: `wait ${EXPR_PLACEHOLDER}`,
            example: "wait Ex"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.27 Relational expression
export const relational: ExpressionGroup = {
    name: "Relational",
    expressions: [
        {
            name: "Less Than",
            template: ` ${SELECTED_EXPRESSION} < ${EXPR_PLACEHOLDER}`,
            example: "Es < Ex",
            symbol: "<"
        }, {
            name: "GreaterThan",
            template: ` ${SELECTED_EXPRESSION} > ${EXPR_PLACEHOLDER}`,
            example: "Es > Ex",
            symbol: ">"
        }, {
            name: "Less Than or Equal",
            template: ` ${SELECTED_EXPRESSION} <= ${EXPR_PLACEHOLDER}`,
            example: "Es <= Ex",
            symbol: "<="
        }, {
            name: "Greater Than or Equal",
            template: ` ${SELECTED_EXPRESSION} >= ${EXPR_PLACEHOLDER}`,
            example: "Es >= Ex",
            symbol: ">="
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.28 Type test expression
const typeTest: ExpressionGroup = {
    name: "Type Test",
    expressions: [
        {
            name: "Type Test",
            template: ` ${SELECTED_EXPRESSION} is ${TYPE_DESC_PLACEHOLDER}`,
            example: "Es is Ex"
        }, {
            name: "Type Test Negation",
            template: ` ${SELECTED_EXPRESSION} !is ${TYPE_DESC_PLACEHOLDER}`,
            example: "Es !is Ex"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.29 Equality expression
export const equality: ExpressionGroup = {
    name: "Equality",
    expressions: [
        {
            name: "Equal",
            template: ` ${SELECTED_EXPRESSION} == ${EXPR_PLACEHOLDER}`,
            example: "Es == Ex",
            symbol: "=="
        }, {
            name: "Not Equal",
            template: ` ${SELECTED_EXPRESSION} != ${EXPR_PLACEHOLDER}`,
            example: "Es != Ex",
            symbol: "!="
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.30 Binary bitwise expression
export const binaryBitwise: ExpressionGroup = {
    name: "Binary Bitwise",
    expressions: [
        {
            name: "Bitwise AND",
            template: ` ${SELECTED_EXPRESSION} & ${EXPR_PLACEHOLDER}`,
            example: "Es & Ex",
            symbol: "&"
        }, {
            name: "Bitwise OR",
            template: ` ${SELECTED_EXPRESSION} | ${EXPR_PLACEHOLDER}`,
            example: "Es | Ex",
            symbol: "|"
        }, {
            name: "Bitwise XOR",
            template: ` ${SELECTED_EXPRESSION} ^ ${EXPR_PLACEHOLDER}`,
            example: "Es ^ Ex",
            symbol: "^"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.31 Logical expression
export const logical: ExpressionGroup = {
    name: "Logical",
    expressions: [
        {
            name: "Logical AND",
            template: ` ${SELECTED_EXPRESSION} && ${EXPR_PLACEHOLDER}`,
            example: "Es && Ex",
            symbol: "&&"
        }, {
            name: "Logical OR",
            template: ` ${SELECTED_EXPRESSION} || ${EXPR_PLACEHOLDER}`,
            example: "Es || Ex",
            symbol: "||"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.32 Conditional expression
const conditional: ExpressionGroup = {
    name: "Conditional",
    expressions: [
        {
            name: "Ternary Conditional",
            template: ` ${SELECTED_EXPRESSION} ? T : F`,
            example: "C ? T : F"
        }, {
            name: "Nil Conditional",
            template: ` ${SELECTED_EXPRESSION} ?: R`,
            example: "L ?: R"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.33 Checking expression
export const checking: ExpressionGroup = {
    name: "Checking errors",
    expressions: [
        {
            name: "Check",
            template: `check ${SELECTED_EXPRESSION}`,
            example: "check Es",
            symbol: "check"
        }, {
            name: "Check and Panic",
            template: `checkpanic ${SELECTED_EXPRESSION}`,
            example: "checkpanic Es",
            symbol: "checkpanic"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.34 Trap expression
export const trap: ExpressionGroup = {
    name: "Trap",
    expressions: [
        {
            name: "Trap",
            template: `trap ${SELECTED_EXPRESSION}`,
            example: "trap Es",
            symbol: "trap"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}
//     6.35 Query expression
//         6.35.1 From clause
//         6.35.2 Where clause
//         6.35.3 Let clause
//         6.35.4 Join clause
//         6.35.5 Order by clause
//         6.35.6 Limit clause
//         6.35.7 Select clause
//         6.35.8 On conflict clause
const query: ExpressionGroup = {
    name: "Query",
    expressions: [
        {
            name: "Query",
            template: `from ${TYPE_DESC_PLACEHOLDER} item in ${EXPR_PLACEHOLDER}
where ${EXPR_PLACEHOLDER}
select ${EXPR_PLACEHOLDER}`,
            example: `from var i in Ex1
where Ex2
select Ex3`
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

const queryIntermediateClauses : ExpressionGroup = {
    name: "Query Intermediate-Clauses",
    expressions: [
        {
            name: "From-Clause",
            template: `from ${TYPE_DESC_PLACEHOLDER} ${BINDING_PATTERN_PLACEHOLDER} in ${EXPR_PLACEHOLDER}`,
            example: "from var i in Ex"
        }, {
            name: "Where-Clause",
            template: `where ${EXPR_PLACEHOLDER}`,
            example: "where Ex"
        }, {
            name: "Let-Clause",
            template: `let ${TYPE_DESC_PLACEHOLDER} ${BINDING_PATTERN_PLACEHOLDER} = ${EXPR_PLACEHOLDER}`,
            example: "let var i = Ex"
        }, {
            name: "Limit-Clause",
            template: `limit ${EXPR_PLACEHOLDER}`,
            example: "limit Ex"
        }, {
            name: "OrderBy-Clause",
            template: `order by ${EXPR_PLACEHOLDER} ascending`,
            example: "order by Ex ascending"
        }
    ],
    relatedModelType: ModelType.QUERY_EXPRESSION
}

const orderKey : ExpressionGroup = {
    name: "Order-key",
    expressions: [
        {
            name: "Ascending order key",
            template: `${SELECTED_EXPRESSION} ascending`,
            example: "Es ascending"
        }, {
            name: "Descending order key",
            template: `${SELECTED_EXPRESSION} descending`,
            example: "Es descending"
        }
    ],
    relatedModelType: ModelType.ORDER_KEY
}

const orderDirectionKeywords: ExpressionGroup = {
    name: "Order Direction Keywords",
    expressions: [
        {
            name: "Ascending order",
            template: `ascending`,
            example: "ascending"
        }, {
            name: "Descending order",
            template: `descending`,
            example: "descending"
        }
    ],
    relatedModelType: ModelType.ORDER_DIRECTION_KEYWORDS
}

//     6.36 XML navigation expression
//         6.36.1 XML name pattern
//         6.36.2 XML filter expression
//         6.36.3 XML step expression
//     6.37 Transactional expression

// 5.4 Structured values
// TODO: Add MapTypeDesc, FutureTypeDesc and distinctTypeDesc when interfaces are added,
// TODO: Add ArrayTypeDesc, XmlTypeDesc and ErrorTypeDesc when the interfaces are updated with proper format
// 5.6 Other type descriptors

const typeDescriptors : ExpressionGroup = {
    name: "Type Descriptors",
    expressions: [
        {
            name: "Array",
            template: `${SELECTED_EXPRESSION}[]`,
            example: "Es[]"
        }, {
            name: "Tuple",
            template: `[${SELECTED_EXPRESSION}]`,
            example: "[Es, Ex]"
        }, {
            name: "Map",
            template: `map<${SELECTED_EXPRESSION}>`,
            example: "map<Es>"
        }, {
            name: "Table",
            template: `table<${SELECTED_EXPRESSION}>`,
            example: "table<Es>"
        }, {
            name: "Stream",
            template: `stream<${SELECTED_EXPRESSION}>`,
            example: "stream<Es>"
        }, {
            name: "Table with Key-Fields",
            template: `table<${SELECTED_EXPRESSION}> key(${EXPR_PLACEHOLDER})`,
            example: "table<Es> key(Ex)"
        }, {
            name: "Union",
            template: `${SELECTED_EXPRESSION} | ${TYPE_DESC_PLACEHOLDER}`,
            example: "Es | Ex"
        }, {
            name: "Intersection",
            template: `${SELECTED_EXPRESSION} & ${TYPE_DESC_PLACEHOLDER}`,
            example: "Es & Ex"
        }, {
            name: "Optional",
            template: `${SELECTED_EXPRESSION}?`,
            example: "Es?"
        }, {
            name: "Parenthesised TypeDesc",
            template: `(${SELECTED_EXPRESSION} )`,
            example: "(Es)"
        }, {
            name: "Inclusive Record",
            template: `record{\n${SELECTED_EXPRESSION} ${BINDING_PATTERN_PLACEHOLDER};\n}`,
            example: "record{Es Ex;}"
        }, {
            name: "Exclusive Record",
            template: `record{|\n${SELECTED_EXPRESSION} ${BINDING_PATTERN_PLACEHOLDER};\n|}`,
            example: "record{|Es Ex;|}"
        }
    ],
    relatedModelType: ModelType.TYPE_DESCRIPTOR
}

const remoteMethodCall: ExpressionGroup = {
    name: "Remote Method Call",
    expressions: [
        {
            name: "Remote Method Call",
            template: `${SELECTED_EXPRESSION}->${EXPR_PLACEHOLDER}()`,
            example: "Es->m()"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

export const recordFiledOptions: ExpressionGroup = {
    name: "Record Field",
    expressions: [
        {
            name: "Default Value",
            template: ` ${SELECTED_EXPRESSION} = ${EXPR_PLACEHOLDER};`,
            example: "Es = Ex;"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

export const switchOpenClose: ExpressionGroup = {
    name: "Switch Record to Open/Close",
    expressions: [
        {
            name: "Switches Open/Close record to Close/Open",
            template: `${SELECTED_EXPRESSION}`,
            example: "record{Es Ex;} <=> record{|Es Ex;|}"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

export const optionalRecordField: ExpressionGroup = {
    name: "Optional Record Field",
    expressions: [
        {
            name: "Optional record field",
            template: `${SELECTED_EXPRESSION}?`,
            example: "Es?",
            symbol: "?"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

export const parenthesis: ExpressionGroup = {
    name: "Parenthesis",
    expressions: [
        {
            name: "Parenthesis",
            template: `(${SELECTED_EXPRESSION} )`,
            example: "(Es)",
            symbol: "()"
        }
    ],
    relatedModelType: ModelType.EXPRESSION
}

export const typeDesc : ExpressionGroup = {
    name: "Type Descriptors",
    expressions: [
        {
            name: "Array",
            template: `${SELECTED_EXPRESSION}[]`,
            example: "Es[]",
            symbol: "Es[]"
        }, {
            name: "Union",
            template: `${SELECTED_EXPRESSION} | ${TYPE_DESC_PLACEHOLDER}`,
            example: "Es | Ex",
            symbol: "|"
        }, {
            name: "Intersection",
            template: `${SELECTED_EXPRESSION} & ${TYPE_DESC_PLACEHOLDER}`,
            example: "Es & Ex",
            symbol: "&"
        }, {
            name: "Optional",
            template: `${SELECTED_EXPRESSION}?`,
            example: "Es?",
            symbol: "?"
        }
    ],
    relatedModelType: ModelType.TYPE_DESCRIPTOR
}

export const operatorSymbols : ExpressionGroup = {
    name: "Operators",
    expressions: [
        {
            name: "Plus",
            template: `+`,
            example: "+"
        }, {
            name: "Minus",
            template: "-",
            example: "-"
        }, {
            name: "Slash",
            template: `/`,
            example: "/"
        }, {
            name: "Asterisk",
            template: `*`,
            example: "*"
        }, {
            name: "BitwiseAnd",
            template: `&`,
            example: "&"
        }, {
            name: "BitwiseXor",
            template: `|`,
            example: "|"
        }, {
            name: "LogicalAnd",
            template: `&&`,
            example: "&&"
        }, {
            name: "LogicalOr",
            template: `||`,
            example: "||"
        }, {
            name: "DoubleEqual",
            template: `==`,
            example: "=="
        }, {
            name: "GreaterThan",
            template: `>`,
            example: ">"
        }, {
            name: "LessThan",
            template: "<",
            example: "<"
        }, {
            name: "Double-greater-than",
            template: `>>`,
            example: ">>"
        }, {
            name: "Double-less-than",
            template: `<<`,
            example: "<<"
        }, {
            name: "Elvis",
            template: `?:`,
            example: "?:"
        }, {
            name: "GreaterThan and Equal",
            template: `>=`,
            example: ">="
        }, {
            name: "LessThan and Equal",
            template: `<=`,
            example: "<="
        }, {
            name: "DoubleEqual",
            template: `==`,
            example: "=="
        }, {
            name: "NotEqual",
            template: `!=`,
            example: "!="
        }, {
            name: "TripleEqual",
            template: `===`,
            example: "==="
        }, {
            name: "Not-DoubleEqual",
            template: `!==`,
            example: "!=="
        }, {
            name: "TripleGreaterThan",
            template: `>>>`,
            example: ">>>"
        }, {
            name: "DoubleDot-less-than",
            template: `..<`,
            example: "..<"
        }, {
            name: "Ellipsis",
            template: `...`,
            example: "..."
        }
    ],
    relatedModelType: ModelType.OPERATOR
}

export const expressions: ExpressionGroup[] = [
    operators,
    equality,
    relational,
    binaryBitwise,
    unary,
    logical,
    conditional,
    checking,
    trap,
    concurrency,
    query,
    typeTest,
    typeofEx,
    typeCastEx,
    templates,
    structuralConstructors,
    memberAccess,
    anonymousFunction,
    range,
    shift,
    typeDescriptors,
    operatorSymbols,
    queryIntermediateClauses,
    remoteMethodCall,
    orderKey,
    orderDirectionKeywords,
    parenthesis
];
