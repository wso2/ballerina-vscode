module io.ballerina.wsdl.extension {
    requires io.ballerina.lang;
    requires io.ballerina.parser;
    requires io.ballerina.formatter.core;
    requires io.ballerina.tools.api;
    requires org.eclipse.lsp4j;
    requires org.eclipse.lsp4j.jsonrpc;
    requires com.google.gson;
    requires io.ballerina.language.server.commons;
    requires io.ballerina.language.server.core;
    requires io.ballerina.wsdl.core;
    requires io.ballerina.xsd.core;
    requires io.ballerina.model.generator.commons;
    requires java.xml;
    requires wsdl4j;

    exports io.ballerina.wsdl.extension;
}
