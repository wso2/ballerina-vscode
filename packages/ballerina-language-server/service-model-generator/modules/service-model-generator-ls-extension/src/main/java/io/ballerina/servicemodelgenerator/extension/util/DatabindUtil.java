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

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.ArrayTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.RecordFieldNode;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.RequiredParameterNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import org.ballerinalang.langserver.common.utils.CommonUtil;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.DATA_BINDING;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.DATA_BINDING_PROPERTY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.DATA_BINDING_TEMPLATE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.EMPTY_ARRAY;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.KIND_REQUIRED;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.getFunctionModel;

/**
 * Utility class for data binding parameter operations.
 *
 * @since 1.3.0
 */
public final class DatabindUtil {

    private DatabindUtil() {
    }

    /**
     * Finds matching functions from both service model and source code.
     *
     * @param service      The service model containing functions
     * @param functionName Name of the function to find
     * @param serviceNode  The ServiceDeclarationNode from source
     * @return FunctionMatch containing the matched functions, or null if target function not found
     */
    private static FunctionMatch findMatchingFunctions(Service service, String functionName,
                                                       ServiceDeclarationNode serviceNode) {
        Function targetFunction = service.getFunctions().stream()
                .filter(func -> func.getName().getValue().equals(functionName))
                .findFirst()
                .orElse(null);

        if (targetFunction == null) {
            return null;
        }

        List<FunctionDefinitionNode> functionNodesInSource = serviceNode.members().stream()
                .filter(member -> member instanceof FunctionDefinitionNode)
                .map(member -> (FunctionDefinitionNode) member)
                .toList();

        Function sourceFunction = null;
        FunctionDefinitionNode sourceFunctionNode = null;
        for (FunctionDefinitionNode node : functionNodesInSource) {
            Function func = getFunctionModel(node, Map.of());
            if (func.getName().getValue().equals(functionName)) {
                sourceFunction = func;
                sourceFunctionNode = node;
                break;
            }
        }

        return new FunctionMatch(targetFunction, sourceFunction, sourceFunctionNode);
    }

    /**
     * Determines data binding configuration by analyzing source function. Extracts the data binding type from record
     * type descriptors if present.
     *
     * @param sourceFunction     The function from source code
     * @param sourceFunctionNode The FunctionDefinitionNode from source
     * @param semanticModel      The semantic model for resolving type references
     * @param payloadFieldName   The field name to look up (e.g., "value" for Kafka, "content" for RabbitMQ)
     * @return DataBindingInfo containing enabled state, parameter type, name, and editability
     */
    private static DataBindingInfo determineDataBindingInfo(Function sourceFunction,
                                                            FunctionDefinitionNode sourceFunctionNode,
                                                            SemanticModel semanticModel,
                                                            String payloadFieldName) {
        boolean dataBindingEnabled = false;
        String paramType = "";
        String paramName = "";
        boolean editable = false;

        if (sourceFunction != null && !sourceFunction.getParameters().isEmpty() && sourceFunctionNode != null) {
            Parameter sourceParam = sourceFunction.getParameters().getFirst();
            paramName = sourceParam.getName().getValue();

            DataBindingTypeInfo typeInfo = extractDataBindingType(sourceFunctionNode, paramName, semanticModel,
                    payloadFieldName);

            if (typeInfo != null && typeInfo.typeName() != null) {
                dataBindingEnabled = true;
                paramType = typeInfo.typeName();
                editable = typeInfo.editable();
            }
        }

        return new DataBindingInfo(dataBindingEnabled, paramType, paramName, editable);
    }

    /**
     * Creates a data binding parameter with the specified configuration.
     *
     * @param paramType          The parameter type value
     * @param paramName          The parameter name value
     * @param dataBindingEnabled Whether the parameter should be enabled
     * @param editable           Whether the parameter should be editable
     * @return The created Parameter object
     */
    private static Parameter createDataBindingParam(String paramType, String paramName,
                                                    boolean dataBindingEnabled, boolean editable) {
        Value parameterType = new Value.ValueBuilder()
                .valueType(Constants.VALUE_TYPE_TYPE)
                .value(paramType)
                .enabled(true)
                .editable(false)
                .build();

        Value parameterNameValue = new Value.ValueBuilder()
                .valueType(Constants.VALUE_TYPE_IDENTIFIER)
                .value(paramName)
                .enabled(true)
                .editable(false)
                .build();

        return new Parameter.Builder()
                .metadata(new MetaData("Data Binding", "Data binding parameter"))
                .kind(DATA_BINDING)
                .type(parameterType)
                .name(parameterNameValue)
                .enabled(dataBindingEnabled)
                .editable(editable)
                .optional(false)
                .build();
    }

    private static Node unwrapArrayType(Node typeNode) {
        return typeNode instanceof ArrayTypeDescriptorNode arrayTypeNode
                ? arrayTypeNode.memberTypeDesc()
                : typeNode;
    }

    /**
     * Extracts data binding type from a type reference (e.g., a named record type).
     *
     * @param simpleNameRef    The simple name reference node
     * @param semanticModel    The semantic model for resolving type references
     * @param payloadFieldName The field name to look up
     * @return DataBindingTypeInfo or null if not found
     */
    private static DataBindingTypeInfo extractFromTypeReference(SimpleNameReferenceNode simpleNameRef,
                                                                SemanticModel semanticModel,
                                                                String payloadFieldName) {
        Optional<Symbol> symbolOpt = semanticModel.symbol(simpleNameRef);
        if (symbolOpt.isEmpty() || !(symbolOpt.get() instanceof TypeReferenceTypeSymbol typeDefSymbol)) {
            return null;
        }

        TypeSymbol typeSymbol = CommonUtil.getRawType(typeDefSymbol.typeDescriptor());
        if (!(typeSymbol instanceof RecordTypeSymbol recordTypeSymbol)) {
            return null;
        }

        String typeName = extractDataBindingTypeFromRecordSymbol(recordTypeSymbol, payloadFieldName);
        return typeName != null
                ? new DataBindingTypeInfo(typeName, false)
                : new DataBindingTypeInfo(simpleNameRef.name().toString().trim(), false);
    }

    /**
     * Extracts data binding type from an inline record type descriptor.
     *
     * @param recordType       The record type descriptor node
     * @param payloadFieldName The field name to look up
     * @return DataBindingTypeInfo or null if not found
     */
    private static DataBindingTypeInfo extractFromInlineRecord(RecordTypeDescriptorNode recordType,
                                                               String payloadFieldName) {
        return recordType.fields().stream()
                .filter(field -> field instanceof RecordFieldNode)
                .map(field -> (RecordFieldNode) field)
                .filter(recordField -> recordField.fieldName().text().trim().equals(payloadFieldName))
                .findFirst()
                .map(recordField -> new DataBindingTypeInfo(recordField.typeName().toString().trim(), true))
                .orElse(null);
    }

    /**
     * Extracts the data binding type from a function parameter.
     *
     * @param functionNode     The FunctionDefinitionNode to analyze
     * @param paramName        The name of the parameter to extract the type from
     * @param semanticModel    The semantic model for resolving type references
     * @param payloadFieldName The field name to look up
     * @return DataBindingTypeInfo or null if not found
     */
    private static DataBindingTypeInfo extractDataBindingType(FunctionDefinitionNode functionNode, String paramName,
                                                              SemanticModel semanticModel,
                                                              String payloadFieldName) {
        Optional<RequiredParameterNode> targetParam = functionNode.functionSignature().parameters().stream()
                .filter(paramNode -> paramNode instanceof RequiredParameterNode)
                .map(paramNode -> (RequiredParameterNode) paramNode)
                .filter(reqParam -> reqParam.paramName().isPresent() &&
                        reqParam.paramName().get().text().trim().equals(paramName))
                .findFirst();

        if (targetParam.isEmpty()) {
            return null;
        }

        Node targetTypeNameNode = unwrapArrayType(targetParam.get().typeName());

        if (targetTypeNameNode instanceof SimpleNameReferenceNode simpleNameRef) {
            return extractFromTypeReference(simpleNameRef, semanticModel, payloadFieldName);
        }

        if (targetTypeNameNode instanceof RecordTypeDescriptorNode recordType) {
            return extractFromInlineRecord(recordType, payloadFieldName);
        }

        return null;
    }

    /**
     * Extracts the data binding field type from a RecordTypeSymbol using efficient map lookup.
     *
     * @param recordTypeSymbol The record type symbol to analyze
     * @param payloadFieldName The specific field name to look up (e.g., "value" for Kafka, "content" for RabbitMQ)
     * @return The data binding type name, or null if not found
     */
    private static String extractDataBindingTypeFromRecordSymbol(RecordTypeSymbol recordTypeSymbol,
                                                                 String payloadFieldName) {
        Map<String, RecordFieldSymbol> fieldSymbols = recordTypeSymbol.fieldDescriptors();

        // Efficient lookup using the specific field name
        RecordFieldSymbol fieldSymbol = fieldSymbols.get(payloadFieldName);
        if (fieldSymbol != null) {
            TypeSymbol fieldType = fieldSymbol.typeDescriptor();
            if (fieldType.getName().isPresent()) {
                return fieldType.getName().get();
            }
            if (!fieldType.signature().isEmpty()) {
                return fieldType.signature();
            }
        }

        return null;
    }

    /**
     * Adds a data binding parameter to the specified function in the service. This method analyzes the source code to
     * determine if data binding is being used and adds the appropriate DATA_BINDING parameter.
     *
     * @param service          The service model containing the functions
     * @param functionName     Name of the function to add the data binding parameter to
     * @param context          ModelFromSourceContext to access the source node
     * @param payloadFieldName The field name to look up (e.g., "value" for Kafka, "content" for RabbitMQ)
     */
    public static void addDataBindingParam(Service service, String functionName, ModelFromSourceContext context,
                                           String payloadFieldName) {
        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) context.node();

        FunctionMatch match = findMatchingFunctions(service, functionName, serviceNode);
        if (match == null || match.targetFunction() == null) {
            return;
        }

        DataBindingInfo dataBindingInfo = determineDataBindingInfo(
                match.sourceFunction(),
                match.sourceFunctionNode(),
                context.semanticModel(),
                payloadFieldName
        );

        Parameter dataBindingParam = createDataBindingParam(
                dataBindingInfo.paramType(),
                dataBindingInfo.paramName(),
                dataBindingInfo.enabled(),
                dataBindingInfo.editable()
        );

        match.targetFunction().addParameter(dataBindingParam);
        match.targetFunction().getCodedata().setModuleName(service.getModuleName());
        match.targetFunction().addProperty(DATA_BINDING_PROPERTY,
                new Value.ValueBuilder().value("true").build()
        );
    }

    /**
     * Creates an inline record type for data binding. Ex. "record {*rabbitmq:AnydataMessage; Order content;}"
     *
     * @param requiredParamType The default parameter type (e.g., "rabbitmq:AnydataMessage")
     * @param dataBindingType   The data binding type (e.g., "Order")
     * @param payloadFieldName  The field name for the payload (e.g., "content")
     * @param isArray           Whether the parameter is an array type
     * @return The inline record type string
     */
    public static String createInlineRecordType(String requiredParamType, String dataBindingType,
                                                String payloadFieldName, boolean isArray) {
        return String.format(DATA_BINDING_TEMPLATE, requiredParamType, dataBindingType, payloadFieldName,
                isArray ? EMPTY_ARRAY : "");
    }

    /**
     * Processes the data binding parameter for functions during code generation. If a DATA_BINDING parameter is
     * enabled, it generates the inline anonymous record type and sets it as the type of the first REQUIRED parameter,
     * then disables the DATA_BINDING parameter.
     *
     * @param function          The function containing the parameters
     * @param requiredParamType The required parameter type (e.g., "rabbitmq:AnydataMessage")
     * @param payloadFieldName  The field name for the payload (e.g., "content")
     * @param isArray           Whether the parameter is an array type
     */
    public static void processDataBindingParameter(Function function, String requiredParamType,
                                                   String payloadFieldName, boolean isArray) {
        List<Parameter> parameters = function.getParameters();
        if (parameters.isEmpty()) {
            return;
        }

        Parameter dataBindingParam = null;
        Parameter requiredParam = null;

        for (Parameter param : parameters) {
            if (DATA_BINDING.equals(param.getKind()) && param.isEnabled()) {
                dataBindingParam = param;
            }
            if (KIND_REQUIRED.equals(param.getKind())) {
                requiredParam = param;
            }
            if (dataBindingParam != null && requiredParam != null) {
                break;
            }
        }

        if (dataBindingParam == null) {
            return;
        }

        String dataBindingType = dataBindingParam.getType().getValue();
        if (dataBindingType == null || dataBindingType.isEmpty()) {
            return;
        }

        if (requiredParam != null) {
            String inlineRecordType = createInlineRecordType(requiredParamType, dataBindingType, payloadFieldName,
                    isArray);
            requiredParam.getType().setValue(inlineRecordType);
            requiredParam.setEnabled(true);
        }

        dataBindingParam.setEnabled(false);
    }

    /**
     * Record to hold matching function references from service and source.
     *
     * @param targetFunction     The function from the service model
     * @param sourceFunction     The function parsed from source code
     * @param sourceFunctionNode The FunctionDefinitionNode from source
     */
    public record FunctionMatch(
            Function targetFunction,
            Function sourceFunction,
            FunctionDefinitionNode sourceFunctionNode
    ) { }

    /**
     * Record to hold data binding configuration information.
     *
     * @param enabled   Whether data binding should be enabled
     * @param paramType The parameter type to use
     * @param paramName The parameter name to use
     * @param editable  Whether the data binding parameter should be editable
     */
    public record DataBindingInfo(
            boolean enabled,
            String paramType,
            String paramName,
            boolean editable
    ) { }

    /**
     * Record to hold extracted data binding type information.
     *
     * @param typeName The data binding type name (e.g., "Order")
     * @param editable Whether the data binding parameter should be editable
     */
    private record DataBindingTypeInfo(
            String typeName,
            boolean editable
    ) { }
}
