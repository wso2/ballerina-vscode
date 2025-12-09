module io.ballerina.edi.extension {
    requires io.ballerina.lang;
    requires io.ballerina.parser;
    requires io.ballerina.tools.api;
    requires io.ballerina.language.server.commons;
    requires io.ballerina.language.server.core;
    requires org.eclipse.lsp4j;
    requires org.eclipse.lsp4j.jsonrpc;
    requires com.google.gson;
    requires io.ballerina.model.generator.commons;

    exports io.ballerina.edi.extension;
}
