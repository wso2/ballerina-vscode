package io.ballerina.flowmodelgenerator.core.model;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Abstract builder class for common builder functionality.
 */
public abstract class AbstractBuilder {
    protected List<AnnotationAttachment> annotationAttachments;
    protected Map<String, String> imports;

    public AbstractBuilder annotationAttachments(List<AnnotationAttachment> annotationAttachments) {
        this.annotationAttachments = annotationAttachments;
        return this;
    }

    public AbstractBuilder imports(Map<String, String> imports) {
        this.imports = imports;
        return this;
    }

    public AbstractBuilder addImport(String key, String value) {
        if (this.imports == null) {
            this.imports = new HashMap<>();
        }
        this.imports.putIfAbsent(key, value);
        return this;
    }
}
