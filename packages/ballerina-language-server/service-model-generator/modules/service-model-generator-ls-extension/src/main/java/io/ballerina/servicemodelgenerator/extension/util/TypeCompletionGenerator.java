/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.servicemodelgenerator.extension.util;

import io.ballerina.compiler.syntax.tree.ClassDefinitionNode;
import io.ballerina.compiler.syntax.tree.EnumDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.TypeDefinitionNode;
import io.ballerina.compiler.syntax.tree.TypeReferenceNode;
import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionItemKind;
import org.eclipse.lsp4j.CompletionItemLabelDetails;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.ERROR_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_ENUM_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_FIELD_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_INPUT_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL_SCALAR_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.USER_DEFINED_TYPE;
import static io.ballerina.servicemodelgenerator.extension.util.HttpUtil.HTTP_RESPONSE_TYPE;

/**
 * Generate type completions for different service model related forms.
 *
 * @since 1.0.0
 */
public class TypeCompletionGenerator {

    private static final List<CompletionItem> DEFAULT_HTTP_STATUS_RESPONSES;
    private static final List<CompletionItem> DEFAULT_GRAPHQL_RETURN_TYPES;
    private static final List<CompletionItem> DEFAULT_GRAPHQL_INPUT_TYPES;

    static {
        List<CompletionItem> defaultResponses = new ArrayList<>();
        List<CompletionItem> inputTypes = new ArrayList<>();

        // HTTP status code types
        defaultResponses.add(build(
                "1XX", "Continue", "http:Continue", "100"));
        defaultResponses.add(build(
                "1XX", "Switching Protocols", "http:SwitchingProtocols", "101"));
        defaultResponses.add(build(
                "1XX", "Processing", "http:Processing", "102"));
        defaultResponses.add(build(
                "1XX", "Early Hints", "http:EarlyHints", "103"));
        defaultResponses.add(build(
                "2XX", "Ok", "http:Ok", "200"));
        defaultResponses.add(build(
                "2XX", "Created", "http:Created", "201"));
        defaultResponses.add(build(
                "2XX", "Accepted", "http:Accepted", "202"));
        defaultResponses.add(build(
                "2XX", "Non Authoritative Information", "http:NonAuthoritativeInformation", "203"));
        defaultResponses.add(build(
                "2XX", "No Content", "http:NoContent", "204"));
        defaultResponses.add(build(
                "2XX", "Reset Content", "http:ResetContent", "205"));
        defaultResponses.add(build(
                "2XX", "Partial Content", "http:PartialContent", "206"));
        defaultResponses.add(build(
                "2XX", "Multi Status", "http:MultiStatus", "207"));
        defaultResponses.add(build(
                "2XX", "Already Reported", "http:AlreadyReported", "208"));
        defaultResponses.add(build(
                "2XX", "IM Used", "http:IMUsed", "226"));
        defaultResponses.add(build(
                "3XX", "Multiple Choices", "http:MultipleChoices", "300"));
        defaultResponses.add(build(
                "3XX", "Moved Permanently", "http:MovedPermanently", "301"));
        defaultResponses.add(build(
                "3XX", "Found", "http:Found", "302"));
        defaultResponses.add(build(
                "3XX", "See Other", "http:SeeOther", "303"));
        defaultResponses.add(build(
                "3XX", "Not Modified", "http:NotModified", "304"));
        defaultResponses.add(build(
                "3XX", "Use Proxy", "http:UseProxy", "305"));
        defaultResponses.add(build(
                "3XX", "Temporary Redirect", "http:TemporaryRedirect", "307"));
        defaultResponses.add(build(
                "3XX", "Permanent Redirect", "http:PermanentRedirect", "308"));
        defaultResponses.add(build(
                "4XX", "Bad Request", "http:BadRequest", "400"));
        defaultResponses.add(build(
                "4XX", "Unauthorized", "http:Unauthorized", "401"));
        defaultResponses.add(build(
                "4XX", "Payment Required", "http:PaymentRequired", "402"));
        defaultResponses.add(build(
                "4XX", "Forbidden", "http:Forbidden", "403"));
        defaultResponses.add(build(
                "4XX", "Not Found", "http:NotFound", "404"));
        defaultResponses.add(build(
                "4XX", "Method Not Allowed", "http:MethodNotAllowed", "405"));
        defaultResponses.add(build(
                "4XX", "Not Acceptable", "http:NotAcceptable", "406"));
        defaultResponses.add(build(
                "4XX", "Proxy Authentication Required", "http:ProxyAuthenticationRequired", "407"));
        defaultResponses.add(build(
                "4XX", "Request Time Out", "http:RequestTimeOut", "408"));
        defaultResponses.add(build(
                "4XX", "Conflict", "http:Conflict", "409"));
        defaultResponses.add(build(
                "4XX", "Gone", "http:Gone", "410"));
        defaultResponses.add(build(
                "4XX", "Length Required", "http:LengthRequired", "411"));
        defaultResponses.add(build(
                "4XX", "Precondition Failed", "http:PreconditionFailed", "412"));
        defaultResponses.add(build(
                "4XX", "Payload Too Large", "http:PayloadTooLarge", "413"));
        defaultResponses.add(build(
                "4XX", "URI Too Long", "http:UriTooLong", "414"));
        defaultResponses.add(build(
                "4XX", "Unsupported Media Type", "http:UnsupportedMediaType", "415"));
        defaultResponses.add(build(
                "4XX", "Range Not Satisfiable", "http:RangeNotSatisfiable", "416"));
        defaultResponses.add(build(
                "4XX", "Expectation Failed", "http:ExpectationFailed", "417"));
        defaultResponses.add(build(
                "4XX", "Misdirected Request", "http:MisdirectedRequest", "421"));
        defaultResponses.add(build(
                "4XX", "Unprocessable Entity", "http:UnprocessableEntity", "422"));
        defaultResponses.add(build(
                "4XX", "Locked", "http:Locked", "423"));
        defaultResponses.add(build(
                "4XX", "Failed Dependency", "http:FailedDependency", "424"));
        defaultResponses.add(build(
                "4XX", "Too Early", "http:TooEarly", "425"));
        defaultResponses.add(build(
                "4XX", "Upgrade Required", "http:UpgradeRequired", "426"));
        defaultResponses.add(build(
                "4XX", "Precondition Required", "http:PreconditionRequired", "428"));
        defaultResponses.add(build(
                "4XX", "Too Many Requests", "http:TooManyRequests", "429"));
        defaultResponses.add(build(
                "4XX", "Request Header Fields Too Large", "http:RequestHeaderFieldsTooLarge", "431"));
        defaultResponses.add(build(
                "4XX", "Unavailable Due to Legal Reasons", "http:UnavailableDueToLegalReasons", "451"));
        defaultResponses.add(build(
                "5XX", "Internal Server Error", "http:InternalServerError", "500"));
        defaultResponses.add(build(
                "5XX", "Not Implemented", "http:NotImplemented", "501"));
        defaultResponses.add(build(
                "5XX", "Bad Gateway", "http:BadGateway", "502"));
        defaultResponses.add(build(
                "5XX", "Service Unavailable", "http:ServiceUnavailable", "503"));
        defaultResponses.add(build(
                "5XX", "Gateway Timeout", "http:GatewayTimeout", "504"));
        defaultResponses.add(build(
                "5XX", "HTTP Version Not Supported", "http:HttpVersionNotSupported", "505"));
        defaultResponses.add(build(
                "5XX", "Variant Also Negotiates", "http:VariantAlsoNegotiates", "506"));
        defaultResponses.add(build(
                "5XX", "Insufficient Storage", "http:InsufficientStorage", "507"));
        defaultResponses.add(build(
                "5XX", "Loop Detected", "http:LoopDetected", "508"));
        defaultResponses.add(build(
                "5XX", "Not Extended", "http:NotExtended", "510"));
        defaultResponses.add(build(
                "5XX", "Network Authentication Required", "http:NetworkAuthenticationRequired", "511"));

        // GraphQL Scalar types
        inputTypes.add(build(GRAPHQL_SCALAR_TYPE, "int", "int"));
        inputTypes.add(build(GRAPHQL_SCALAR_TYPE, "string", "string"));
        inputTypes.add(build(GRAPHQL_SCALAR_TYPE, "boolean", "boolean"));
        inputTypes.add(build(GRAPHQL_SCALAR_TYPE, "decimal", "decimal"));
        inputTypes.add(build(GRAPHQL_SCALAR_TYPE, "float", "float"));

        List<CompletionItem> returnTypes = new ArrayList<>(inputTypes);
        returnTypes.add(build("Error Types", "error", "error"));
        DEFAULT_HTTP_STATUS_RESPONSES = Collections.unmodifiableList(defaultResponses);
        DEFAULT_GRAPHQL_RETURN_TYPES = Collections.unmodifiableList(returnTypes);
        DEFAULT_GRAPHQL_INPUT_TYPES = Collections.unmodifiableList(inputTypes);
    }

    public static List<CompletionItem> getTypes(Project project, String context) {
        switch (context) {
            case GRAPHQL_FIELD_TYPE -> {
                return getGraphqlTypes(project, false);
            }
            case GRAPHQL_INPUT_TYPE -> {
                return getGraphqlTypes(project, true);
            }
            default -> {
                return getHttpTypes(project);
            }
        }
    }

    public static List<CompletionItem> getHttpTypes(Project project) {
        // Add the default http status code types
        List<CompletionItem> completionItems = new ArrayList<>(DEFAULT_HTTP_STATUS_RESPONSES);

        // Add the http status code types from the project
        Module defaultModule = project.currentPackage().getDefaultModule();
        defaultModule.documentIds().forEach(
                documentId -> {
                    Document document = defaultModule.document(documentId);
                    ModulePartNode modulePartNode = document.syntaxTree().rootNode();
                    modulePartNode.members().stream()
                            .filter(member -> member.kind() == SyntaxKind.TYPE_DEFINITION &&
                                    ((TypeDefinitionNode) member).typeDescriptor().kind()
                                            == SyntaxKind.RECORD_TYPE_DESC)
                            .map(member -> ((TypeDefinitionNode) member))
                            .forEach(typeDef -> {
                                NodeList<Node> fields = ((RecordTypeDescriptorNode) typeDef.typeDescriptor()).fields();
                                for (Node field : fields) {
                                    if (field instanceof TypeReferenceNode typeReferenceNode) {
                                        String typeReference = typeReferenceNode.typeName().toString();
                                        if (typeReference.startsWith("http:")) {
                                            String typeReferenceName = typeReference.substring(5).strip();
                                            String statusCode = HttpUtil.HTTP_CODES.get(typeReferenceName);
                                            String typeName = typeDef.typeName().text();
                                            completionItems.add(build(
                                                    USER_DEFINED_TYPE, typeName, typeName, statusCode));
                                        }
                                    }
                                }
                            });
                });

        completionItems.add(build("Dynamic", "Response", HTTP_RESPONSE_TYPE, "Dynamic"));

        // Add the http:Response type
        completionItems.add(build("Error Type", "error", "error", "500"));

        return completionItems;
    }

    private static List<CompletionItem> getGraphqlTypes(Project project, boolean isInput) {
        Module defaultModule = project.currentPackage().getDefaultModule();
        List<CompletionItem> completionItems = new ArrayList<>(isInput ? DEFAULT_GRAPHQL_INPUT_TYPES :
                DEFAULT_GRAPHQL_RETURN_TYPES);
        defaultModule.documentIds().forEach(
                documentId -> {
                    Document document = defaultModule.document(documentId);
                    ModulePartNode modulePartNode = document.syntaxTree().rootNode();
                    for (Node member : modulePartNode.members()) {
                        if (member instanceof TypeDefinitionNode typeDefNode) {
                            if (typeDefNode.typeDescriptor().kind() == SyntaxKind.RECORD_TYPE_DESC && isInput) {
                                String typeName = typeDefNode.typeName().text();
                                completionItems.add(build(USER_DEFINED_TYPE, typeName, typeName));
                            } else if (!isInput) {
                                String typeName = typeDefNode.typeName().text();
                                completionItems.add(build(USER_DEFINED_TYPE, typeName, typeName));
                            }
                        } else if (member instanceof ClassDefinitionNode classDefNode && !isInput) {
                            String typeName = classDefNode.className().text();
                            completionItems.add(build(USER_DEFINED_TYPE, typeName, typeName));
                        } else if (member instanceof EnumDeclarationNode enumNode) {
                            String typeName = enumNode.identifier().toString().trim();
                            completionItems.add(build(GRAPHQL_ENUM_TYPE, typeName, typeName));
                        }
                    }
                });
        return completionItems;
    }

    private static CompletionItem build(String category, String label, String type) {
        CompletionItem item = new CompletionItem();

        CompletionItemLabelDetails labelDetails = new CompletionItemLabelDetails();
        labelDetails.setDetail(category);
        labelDetails.setDescription(category);
        item.setLabelDetails(labelDetails);

        if (category.equals(GRAPHQL_SCALAR_TYPE)) {
            item.setKind(CompletionItemKind.TypeParameter);
        } else if (category.equals(USER_DEFINED_TYPE)) {
            item.setKind(CompletionItemKind.Interface);
        } else if (category.equals(GRAPHQL_ENUM_TYPE)) {
            item.setKind(CompletionItemKind.Enum);
        } else if (category.equals(ERROR_TYPE)) {
            item.setKind(CompletionItemKind.Event);
        } else {
            item.setKind(CompletionItemKind.Class);
        }
        item.setLabel(label);
        item.setDetail(type);
        item.setInsertText(label);
        return item;
    }

    private static CompletionItem build(String category, String label, String type, String statusCode) {
        CompletionItem item = build(category, label, type);
        item.getLabelDetails().setDetail(statusCode);
        return item;
    }
}
