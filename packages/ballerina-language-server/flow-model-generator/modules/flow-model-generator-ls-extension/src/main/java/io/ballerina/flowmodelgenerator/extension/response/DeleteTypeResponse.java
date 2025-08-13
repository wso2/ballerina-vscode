package io.ballerina.flowmodelgenerator.extension.response;

import com.google.gson.JsonElement;
import org.eclipse.lsp4j.TextEdit;

import java.util.List;
import java.util.Map;

public class DeleteTypeResponse extends AbstractFlowModelResponse {
    private JsonElement textEdits;

    public JsonElement getTextEdits() {
        return textEdits;
    }

    public void setTextEdits(JsonElement textEdits) {
        this.textEdits = textEdits;
    }
}
