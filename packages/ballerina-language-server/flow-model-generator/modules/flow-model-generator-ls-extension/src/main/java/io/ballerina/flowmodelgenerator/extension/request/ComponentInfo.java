package io.ballerina.flowmodelgenerator.extension.request;

public record ComponentInfo(
        String name,
        String filePath,
        int startLine,
        int startColumn,
        int endLine,
        int endColumn
) {}
