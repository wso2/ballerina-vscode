package io.ballerina.copilotagent.extension.response;

import io.ballerina.copilotagent.core.models.SemanticDiff;
import io.ballerina.designmodelgenerator.extension.response.AbstractResponse;

import java.util.List;

public class SemanticDiffResponse extends AbstractResponse {
    private boolean loadDesignDiagrams;
    private List<SemanticDiff> semanticDiffs;

    public boolean isLoadDesignDiagrams() {
        return loadDesignDiagrams;
    }

    public void setLoadDesignDiagrams(boolean loadDesignDiagrams) {
        this.loadDesignDiagrams = loadDesignDiagrams;
    }

    public List<SemanticDiff> getSemanticDiffs() {
        return semanticDiffs;
    }

    public void setSemanticDiffs(List<SemanticDiff> semanticDiffs) {
        this.semanticDiffs = semanticDiffs;
    }
}
