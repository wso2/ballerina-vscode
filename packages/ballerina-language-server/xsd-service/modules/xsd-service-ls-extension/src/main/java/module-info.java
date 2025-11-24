module io.ballerina.xsd.extension {
    requires io.ballerina.lang;
    requires io.ballerina.parser;
    requires io.ballerina.tools.api;
    requires io.ballerina.formatter.core;
    requires org.eclipse.lsp4j;
    requires org.eclipse.lsp4j.jsonrpc;
    requires io.ballerina.language.server.commons;
    requires io.ballerina.language.server.core;
    requires com.google.gson;
    requires io.ballerina.xsd.core;
    requires io.ballerina.model.generator.commons;
    requires java.xml;

    exports io.ballerina.xsd.extension;
}
