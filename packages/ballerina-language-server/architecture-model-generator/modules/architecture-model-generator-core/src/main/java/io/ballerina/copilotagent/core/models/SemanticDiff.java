package io.ballerina.copilotagent.core.models;

import io.ballerina.tools.text.LineRange;

public record SemanticDiff(ChangeType changeType, NodeKind nodeKind, String uri, LineRange lineRange) {
}
