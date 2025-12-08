package io.ballerina.copilotagent.core.models;

import java.util.List;

public record Result(boolean loadDesignDiagrams, List<SemanticDiff> semanticDiffs) {
}
