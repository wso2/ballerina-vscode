/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package io.ballerina.flowmodelgenerator.core.model.node.builtin;

import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static io.ballerina.modelgenerator.commons.ParameterData.Kind.REQUIRED;

/**
 * Strategy for the {@code activity:callSoapAPI} builtin activity. The SOAP version is
 * implicit in the chosen connection ({@code soap11:Client} or {@code soap12:Client});
 * only the per-call fields are surfaced here.
 *
 * @since 1.8.0
 */
public class SoapActivityStrategy implements BuiltinActivityStrategy {

    // Property keys (match the parameter names of activity:callSoapAPI)
    public static final String BODY_KEY = "body";
    public static final String ACTION_KEY = "action";
    public static final String HEADERS_KEY = "headers";
    public static final String PATH_KEY = "path";

    private static final String STRATEGY_LABEL = "Call SOAP API";
    private static final String STRATEGY_DESCRIPTION =
            "Call a SOAP web service as a workflow activity using a configured "
                    + "soap11:Client or soap12:Client connection.";

    public static final String SOAP_PKG_ORG = "ballerina";
    public static final String SOAP11_MODULE = "soap.soap11";
    public static final String SOAP12_MODULE = "soap.soap12";

    @Override
    public void setFormProperties(NodeBuilder nodeBuilder, NodeBuilder.TemplateContext context) {
        // Body — required xml envelope
        nodeBuilder.properties().custom()
                .metadata()
                    .label("Body")
                    .description("SOAP envelope as xml")
                    .stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("xml").selected(true).stepOut()
                .codedata().kind(REQUIRED.name()).stepOut()
                .value("")
                .editable(true)
                .stepOut()
                .addProperty(BODY_KEY);

        // Action — optional string?; required for SOAP 1.1 endpoints (note in description)
        nodeBuilder.properties().custom()
                .metadata()
                    .label("Action")
                    .description("SOAPAction header. Required for SOAP 1.1 endpoints; optional for SOAP 1.2.")
                    .stepOut()
                .type().fieldType(Property.ValueType.TEXT).ballerinaType("string").selected(true).stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("string?").selected(false).stepOut()
                .value("")
                .placeholder("http://tempuri.org/Add")
                .editable(true)
                .optional(true)
                .stepOut()
                .addProperty(ACTION_KEY);

        // Headers — optional map<string|string[]>, advanced
        nodeBuilder.properties().custom()
                .metadata()
                    .label("Headers")
                    .description("Additional HTTP headers")
                    .stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION)
                    .ballerinaType("map<string|string[]>").selected(true).stepOut()
                .value("")
                .editable(true)
                .optional(true)
                .advanced(true)
                .stepOut()
                .addProperty(HEADERS_KEY);

        // Path — optional, appended to endpoint URL, advanced
        nodeBuilder.properties().custom()
                .metadata()
                    .label("Path")
                    .description("Optional resource path appended to the connection's base URL")
                    .stepOut()
                .type().fieldType(Property.ValueType.TEXT).ballerinaType("string").selected(true).stepOut()
                .type().fieldType(Property.ValueType.EXPRESSION).ballerinaType("string").selected(false).stepOut()
                .value("")
                .editable(true)
                .optional(true)
                .advanced(true)
                .stepOut()
                .addProperty(PATH_KEY);
    }

    @Override
    public String activityFunctionSymbol() {
        return "callSoapAPI";
    }

    @Override
    public String searchNodesKind() {
        return "SOAP";
    }

    @Override
    public List<Metadata.AllowedConnector> connectors() {
        Codedata soap11 = new Codedata.Builder<>(null)
                .node(NodeKind.NEW_CONNECTION)
                .org(SOAP_PKG_ORG).module(SOAP11_MODULE).packageName("soap")
                .object("Client").symbol("init")
                .build();
        Codedata soap12 = new Codedata.Builder<>(null)
                .node(NodeKind.NEW_CONNECTION)
                .org(SOAP_PKG_ORG).module(SOAP12_MODULE).packageName("soap")
                .object("Client").symbol("init")
                .build();
        return List.of(
                new Metadata.AllowedConnector(soap11, "Add new SOAP 1.1 connection"),
                new Metadata.AllowedConnector(soap12, "Add new SOAP 1.2 connection")
        );
    }

    @Override
    public String connectionBallerinaType() {
        return "soap11:Client|soap12:Client";
    }

    @Override
    public List<String> getCallActivityArgs(SourceBuilder sourceBuilder) {
        Map<String, Property> properties = sourceBuilder.flowNode.properties();
        List<String> args = new ArrayList<>();

        // body — always an expression, no quoting
        String body = BuiltinActivityStrategy.getPropertyValue(properties, BODY_KEY, "");
        if (!body.isEmpty()) {
            args.add("body: " + body);
        }

        // action — quote if TEXT-typed
        BuiltinActivityStrategy.addQuotedArg(args, "action", properties, ACTION_KEY);

        // headers — expression, no quoting
        String headers = BuiltinActivityStrategy.getPropertyValue(properties, HEADERS_KEY, "");
        if (!headers.isEmpty()) {
            args.add("headers: " + headers);
        }

        // path — quote if TEXT-typed
        BuiltinActivityStrategy.addQuotedArg(args, "path", properties, PATH_KEY);

        return args;
    }

    @Override
    public List<Import> getRequiredImports(SourceBuilder sourceBuilder) {
        // Import both SOAP modules so that the file can resolve either client type.
        // The actual connection variable is declared in user source and only one will
        // be active at runtime; the unused import is a small cost for simplicity.
        return List.of(
                new Import(SOAP_PKG_ORG, SOAP11_MODULE),
                new Import(SOAP_PKG_ORG, SOAP12_MODULE)
        );
    }

    @Override
    public String getLabel() {
        return STRATEGY_LABEL;
    }

    @Override
    public String getDescription() {
        return STRATEGY_DESCRIPTION;
    }
}
