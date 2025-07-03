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
import io.ballerina.servicemodelgenerator.extension.response.TypeResponse.TypeCompletion;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Generate type completions for different service model related forms.
 *
 * @since 1.1.0
 */
public class TypeCompletionGenerator {

    private static final List<TypeCompletion> DEFAULT_HTTP_STATUS_RESPONSES;
    static {
        List<TypeCompletion> defaultResponses = new ArrayList<>();
        defaultResponses.add(new TypeCompletion(
                "1XX", "Continue", "http:Continue", "100"));
        defaultResponses.add(new TypeCompletion(
                "1XX", "Switching Protocols", "http:SwitchingProtocols", "101"));
        defaultResponses.add(new TypeCompletion(
                "1XX", "Processing", "http:Processing", "102"));
        defaultResponses.add(new TypeCompletion(
                "1XX", "Early Hints", "http:EarlyHints", "103"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Ok", "http:Ok", "200"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Created", "http:Created", "201"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Accepted", "http:Accepted", "202"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Non Authoritative Information", "http:NonAuthoritativeInformation", "203"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "No Content", "http:NoContent", "204"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Reset Content", "http:ResetContent", "205"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Partial Content", "http:PartialContent", "206"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Multi Status", "http:MultiStatus", "207"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "Already Reported", "http:AlreadyReported", "208"));
        defaultResponses.add(new TypeCompletion(
                "2XX", "IM Used", "http:IMUsed", "226"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Multiple Choices", "http:MultipleChoices", "300"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Moved Permanently", "http:MovedPermanently", "301"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Found", "http:Found", "302"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "See Other", "http:SeeOther", "303"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Not Modified", "http:NotModified", "304"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Use Proxy", "http:UseProxy", "305"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Temporary Redirect", "http:TemporaryRedirect", "307"));
        defaultResponses.add(new TypeCompletion(
                "3XX", "Permanent Redirect", "http:PermanentRedirect", "308"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Bad Request", "http:BadRequest", "400"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Unauthorized", "http:Unauthorized", "401"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Payment Required", "http:PaymentRequired", "402"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Forbidden", "http:Forbidden", "403"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Not Found", "http:NotFound", "404"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Method Not Allowed", "http:MethodNotAllowed", "405"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Not Acceptable", "http:NotAcceptable", "406"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Proxy Authentication Required", "http:ProxyAuthenticationRequired", "407"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Request Time Out", "http:RequestTimeOut", "408"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Conflict", "http:Conflict", "409"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Gone", "http:Gone", "410"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Length Required", "http:LengthRequired", "411"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Precondition Failed", "http:PreconditionFailed", "412"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Payload Too Large", "http:PayloadTooLarge", "413"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "URI Too Long", "http:UriTooLong", "414"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Unsupported Media Type", "http:UnsupportedMediaType", "415"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Range Not Satisfiable", "http:RangeNotSatisfiable", "416"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Expectation Failed", "http:ExpectationFailed", "417"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Misdirected Request", "http:MisdirectedRequest", "421"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Unprocessable Entity", "http:UnprocessableEntity", "422"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Locked", "http:Locked", "423"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Failed Dependency", "http:FailedDependency", "424"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Too Early", "http:TooEarly", "425"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Upgrade Required", "http:UpgradeRequired", "426"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Precondition Required", "http:PreconditionRequired", "428"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Too Many Requests", "http:TooManyRequests", "429"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Request Header Fields Too Large", "http:RequestHeaderFieldsTooLarge", "431"));
        defaultResponses.add(new TypeCompletion(
                "4XX", "Unavailable Due to Legal Reasons", "http:UnavailableDueToLegalReasons", "451"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Internal Server Error", "http:InternalServerError", "500"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Not Implemented", "http:NotImplemented", "501"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Bad Gateway", "http:BadGateway", "502"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Service Unavailable", "http:ServiceUnavailable", "503"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Gateway Timeout", "http:GatewayTimeout", "504"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "HTTP Version Not Supported", "http:HttpVersionNotSupported", "505"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Variant Also Negotiates", "http:VariantAlsoNegotiates", "506"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Insufficient Storage", "http:InsufficientStorage", "507"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Loop Detected", "http:LoopDetected", "508"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Not Extended", "http:NotExtended", "510"));
        defaultResponses.add(new TypeCompletion(
                "5XX", "Network Authentication Required", "http:NetworkAuthenticationRequired", "511"));
        DEFAULT_HTTP_STATUS_RESPONSES = Collections.unmodifiableList(defaultResponses);
    }

    public static void getTypes(Project project, List<TypeCompletion> typeCompletions) {
         // Add the default http status code types
        typeCompletions.addAll(DEFAULT_HTTP_STATUS_RESPONSES);

        // Add the http status code types from the project
        Module defaultModule = project.currentPackage().getDefaultModule();
        defaultModule.documentIds().stream().forEach(
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
                                            typeCompletions.add(new TypeCompletion(
                                                    "User Defined", typeName, typeName, statusCode));
                                        }
                                    }
                                }
                            });
                });

        typeCompletions.add(new TypeCompletion("Dynamic", "Response", "http:Response", "Dynamic"));

        // Add the http:Response type
        typeCompletions.add(new TypeCompletion("Error Type", "error", "error", "500"));
    }
}
