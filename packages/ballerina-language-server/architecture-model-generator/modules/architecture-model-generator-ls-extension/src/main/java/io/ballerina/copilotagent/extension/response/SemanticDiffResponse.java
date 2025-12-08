package io.ballerina.copilotagent.extension.response;

import io.ballerina.copilotagent.core.models.SemanticDiff;

import java.util.List;

public record SemanticDiffResponse(List<SemanticDiff> semanticDiffs) {
}
