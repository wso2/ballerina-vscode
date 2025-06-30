export const MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX = "mappingConstructor";
export const LIST_CONSTRUCTOR_TARGET_PORT_PREFIX = "listConstructor";
export const PRIMITIVE_TYPE_TARGET_PORT_PREFIX = "primitiveType";
export const UNION_TYPE_TARGET_PORT_PREFIX = "unionType";
export const LET_EXPRESSION_SOURCE_PORT_PREFIX = "letExpression";
export const ENUM_TYPE_SOURCE_PORT_PREFIX = "enumType";
export const MODULE_VARIABLE_SOURCE_PORT_PREFIX = "moduleVariable";
export const EXPANDED_QUERY_SOURCE_PORT_PREFIX = "expandedQueryExpr.source";
export const EXPANDED_QUERY_INPUT_NODE_PREFIX = "expandedQueryExpr.input";
export const FUNCTION_BODY_QUERY = "FunctionBody.query";
export const SELECT_CALUSE_QUERY = "SelectClause.query";
export const SYMBOL_KIND_CONSTANT = "CONSTANT";

export const JSON_MERGE_MODULE_NAME = "ballerina/lang.value";
export const defaultModelOptions = { zoom: 90 };
export const VISUALIZER_PADDING = 0;
export const IO_NODE_DEFAULT_WIDTH = 350;
export const IO_NODE_HEADER_HEIGHT = 40;
export const IO_NODE_FIELD_HEIGHT = 35;
export const GAP_BETWEEN_INPUT_NODES = 10;
export const GAP_BETWEEN_NODE_HEADER_AND_BODY = 10;
export const GAP_BETWEEN_FIELDS = 1;
export const QUERY_EXPR_INTERMEDIATE_CLAUSE_HEIGHT = 40;
export const GAP_BETWEEN_INTERMEDIATE_CLAUSES = 25;
export const GAP_BETWEEN_INTERMEDIATE_CLAUSES_AND_NODE = 30;
export const GAP_BETWEEN_MAPPING_HEADER_NODE_AND_INPUT_NODE = 50;

export const AUTO_MAP_TIMEOUT_MS = 2000000;
export const AUTO_MAP_IN_PROGRESS_MSG = "Generating mappings for your transformation";

export const OFFSETS = {
    SOURCE_NODE: {
        X: 0,
        Y: 0,
    },
    TARGET_NODE: {
        X: (window.innerWidth -VISUALIZER_PADDING)*(100/defaultModelOptions.zoom)-IO_NODE_DEFAULT_WIDTH,
        Y: 0
    },
    QUERY_MAPPING_HEADER_NODE: {
        X: 25,
        Y: 25,
        MARGIN_BOTTOM: 65
    },
    LINK_CONNECTOR_NODE: {
        X: 750
    },
    LINK_CONNECTOR_NODE_WITH_ERROR: {
        X: 718
    },
    QUERY_EXPRESSION_NODE: {
        X: 750
    },
    INTERMEDIATE_CLAUSE_HEIGHT: 80,
    QUERY_VIEW_LEFT_MARGIN: 0,
    QUERY_VIEW_TOP_MARGIN: 50,
}

