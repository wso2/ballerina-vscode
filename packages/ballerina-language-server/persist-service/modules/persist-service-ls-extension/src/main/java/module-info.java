module io.ballerina.persist.extension {
    requires io.ballerina.lang;
    requires io.ballerina.parser;
    requires io.ballerina.formatter.core;
    requires io.ballerina.tools.api;
    requires org.eclipse.lsp4j;
    requires org.eclipse.lsp4j.jsonrpc;
    requires com.google.gson;
    requires io.ballerina.language.server.commons;
    requires io.ballerina.language.server.core;
    requires io.ballerina.model.generator.commons;
    requires io.ballerina.persist.core;
    requires io.ballerina.toml;

    exports io.ballerina.persist.extension;
}
