/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.MethodSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.BinaryExpressionNode;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.ClauseNode;
import io.ballerina.compiler.syntax.tree.CollectClauseNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FieldAccessExpressionNode;
import io.ballerina.compiler.syntax.tree.FromClauseNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.FunctionCallExpressionNode;
import io.ballerina.compiler.syntax.tree.ImplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.IntermediateClauseNode;
import io.ballerina.compiler.syntax.tree.LetExpressionNode;
import io.ballerina.compiler.syntax.tree.LetVariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.ListConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.MethodCallExpressionNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ModuleVariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ParenthesizedArgList;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.QueryExpressionNode;
import io.ballerina.compiler.syntax.tree.QueryPipelineNode;
import io.ballerina.compiler.syntax.tree.SelectClauseNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.compiler.syntax.tree.TypedBindingPatternNode;
import io.ballerina.compiler.syntax.tree.VariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.WhereClauseNode;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.DefaultValueGeneratorUtil;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import io.ballerina.tools.diagnostics.Diagnostic;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextDocumentChange;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.diagramutil.connector.models.connector.Type;
import org.ballerinalang.diagramutil.connector.models.connector.TypeInfo;
import org.ballerinalang.diagramutil.connector.models.connector.types.ArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.types.PrimitiveType;
import org.ballerinalang.diagramutil.connector.models.connector.types.RecordType;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Generates types of the data mapper model.
 *
 * @since 1.0.0
 */
public class DataMapManager {

    public static final String DOT = "\\.";
    private final WorkspaceManager workspaceManager;
    private final Document document;
    private final Gson gson;

    public DataMapManager(WorkspaceManager workspaceManager, Document document) {
        this.workspaceManager = workspaceManager;
        this.document = document;
        this.gson = new Gson();
    }

    public JsonElement getTypes(JsonElement node, String propertyKey, SemanticModel semanticModel) {
        FlowNode flowNode = gson.fromJson(node, FlowNode.class);
        Codedata codedata = flowNode.codedata();
        NodeKind nodeKind = codedata.node();
        if (nodeKind == NodeKind.VARIABLE) {
            String dataType = flowNode.properties().get(Property.TYPE_KEY).toSourceCode();
            Optional<Symbol> varSymbol = getSymbol(semanticModel.moduleSymbols(), dataType);
            if (varSymbol.isEmpty()) {
                throw new IllegalStateException("Symbol cannot be found for : " + dataType);
            }
            Type t = Type.fromSemanticSymbol(varSymbol.get());
            if (t == null) {
                throw new IllegalStateException("Type cannot be found for : " + propertyKey);
            }
            return gson.toJsonTree(t);
        } else if (nodeKind == NodeKind.FUNCTION_CALL) {
            Optional<Symbol> varSymbol = getSymbol(semanticModel.moduleSymbols(), codedata.symbol());
            if (varSymbol.isEmpty() || varSymbol.get().kind() != SymbolKind.FUNCTION) {
                throw new IllegalStateException("Symbol cannot be found for : " + codedata.symbol());
            }
            Optional<List<ParameterSymbol>> optParams = ((FunctionSymbol) varSymbol.get()).typeDescriptor().params();
            if (optParams.isEmpty()) {
                return new JsonObject();
            }
            Optional<Type> type = optParams.flatMap(params -> params.parallelStream()
                    .filter(param -> param.nameEquals(propertyKey)).findAny()).map(Type::fromSemanticSymbol);
            if (type.isEmpty()) {
                throw new IllegalStateException("Type cannot be found for : " + propertyKey);
            }
            return gson.toJsonTree(type.get());
        }
        return new JsonObject();
    }

    private Optional<Symbol> getSymbol(List<Symbol> symbols, String name) {
        return symbols.parallelStream()
                .filter(symbol -> symbol.nameEquals(name))
                .findAny();
    }

    public JsonElement getMappings(SemanticModel semanticModel, JsonElement cd, LinePosition position,
                                   String propertyKey, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);

        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        LineRange lineRange = codedata.lineRange();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        NonTerminalNode node = modulePartNode.findNode(TextRange.from(start, end - start), true);

        List<MappingPort> inputPorts = getInputPorts(semanticModel, this.document, position);
        inputPorts.sort(Comparator.comparing(mt -> mt.id));

        TargetNode targetNode = getTargetNode(node, targetField, codedata.node(), propertyKey, semanticModel);
        if (targetNode == null) {
            return null;
        }

        Type type = Type.fromSemanticSymbol(targetNode.typeSymbol());
        String name = targetNode.name();
        MappingPort outputPort = getMappingPort(name, name, type, false);
        ExpressionNode expressionNode = targetNode.expressionNode();
        if (expressionNode == null) {
            return gson.toJsonTree(new Model(inputPorts, outputPort, new ArrayList<>(), null));
        }

        Query query = null;
        List<MappingPort> subMappingPorts = null;
        if (expressionNode.kind() == SyntaxKind.QUERY_EXPRESSION) {
            QueryExpressionNode queryExpressionNode = (QueryExpressionNode) targetNode.expressionNode();
            FromClauseNode fromClauseNode = queryExpressionNode.queryPipeline().fromClause();
            List<String> inputs = new ArrayList<>();
            ExpressionNode expression = fromClauseNode.expression();
            inputs.add(expression.toSourceCode().trim());
            Optional<TypeSymbol> typeSymbol = semanticModel.typeOf(expression);
            String itemType = fromClauseNode.typedBindingPattern().typeDescriptor().toSourceCode().trim();
            String fromClauseVar = fromClauseNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
            if (typeSymbol.isPresent() && typeSymbol.get().typeKind() == TypeDescKind.ARRAY) {
                TypeSymbol memberTypeSymbol = ((ArrayTypeSymbol) typeSymbol.get()).memberTypeDescriptor();
                inputPorts.add(
                        getMappingPort(fromClauseVar, fromClauseVar, Type.fromSemanticSymbol(memberTypeSymbol), true));
                itemType = memberTypeSymbol.signature().trim();
            }

            FromClause fromClause = new FromClause(itemType, fromClauseVar, expression.toSourceCode().trim());
            String resultClause;
            ClauseNode clauseNode = queryExpressionNode.resultClause();
            if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                resultClause = ((SelectClauseNode) clauseNode).expression().toSourceCode().trim();
            } else {
                resultClause = ((CollectClauseNode) clauseNode).expression().toSourceCode().trim();
            }
            query = new Query(targetField, inputs, fromClause,
                    getQueryIntermediateClause(queryExpressionNode.queryPipeline()), resultClause);
        } else if (expressionNode.kind() == SyntaxKind.LET_EXPRESSION) {
            LetExpressionNode letExpressionNode = (LetExpressionNode) expressionNode;
            subMappingPorts = new ArrayList<>();
            for (LetVariableDeclarationNode letVarDeclaration : letExpressionNode.letVarDeclarations()) {
                Optional<Symbol> optSymbol = semanticModel.symbol(letVarDeclaration);
                if (optSymbol.isEmpty()) {
                    continue;
                }
                Symbol symbol = optSymbol.get();
                String letVarName = symbol.getName().orElseThrow();
                subMappingPorts.add(getMappingPort(letVarName, letVarName, Type.fromSemanticSymbol(symbol), false));
            }
        }

        List<Mapping> mappings = new ArrayList<>();
        TypeDescKind typeDescKind = CommonUtils.getRawType(targetNode.typeSymbol()).typeKind();
        if (typeDescKind == TypeDescKind.RECORD) {
            generateRecordVariableDataMapping(expressionNode, mappings, name, semanticModel);
        } else if (typeDescKind == TypeDescKind.ARRAY) {
            generateArrayVariableDataMapping(expressionNode, mappings, name, semanticModel);
        }

        return gson.toJsonTree(new Model(inputPorts, outputPort, subMappingPorts, mappings, query));
    }

    private TargetNode getTargetNode(Node parentNode, String targetField, NodeKind nodeKind, String propertyKey,
                                     SemanticModel semanticModel) {
        SyntaxKind kind = parentNode.kind();
        Optional<ExpressionNode> optInitializer;
        TypedBindingPatternNode typedBindingPattern;
        if (kind == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode varDeclNode = (VariableDeclarationNode) parentNode;
            optInitializer = varDeclNode.initializer();
            typedBindingPattern = varDeclNode.typedBindingPattern();
        } else if (kind == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVarDeclNode = (ModuleVariableDeclarationNode) parentNode;
            optInitializer = moduleVarDeclNode.initializer();
            typedBindingPattern = moduleVarDeclNode.typedBindingPattern();
        } else {
            return null;
        }

        Optional<Symbol> optSymbol = semanticModel.symbol(parentNode);
        if (optSymbol.isEmpty()) {
            return null;
        }
        Symbol symbol = optSymbol.get();
        if (symbol.kind() != SymbolKind.VARIABLE) {
            return null;
        }
        VariableSymbol variableSymbol = (VariableSymbol) symbol;

        TypeSymbol typeSymbol = variableSymbol.typeDescriptor();
        if (optInitializer.isEmpty()) {
            return new TargetNode(typeSymbol, variableSymbol.getName().get(), null);
        }
        ExpressionNode initializer = optInitializer.get();
        if (initializer.kind() == SyntaxKind.FUNCTION_CALL && nodeKind == NodeKind.FUNCTION_CALL) {
            FunctionCallExpressionNode funcCallExprNode = (FunctionCallExpressionNode) initializer;
            Optional<Symbol> optFunctionSymbol = semanticModel.symbol(funcCallExprNode);
            if (optFunctionSymbol.isEmpty() || optFunctionSymbol.get().kind() != SymbolKind.FUNCTION) {
                return null;
            }
            FunctionSymbol functionSymbol = (FunctionSymbol) optFunctionSymbol.get();
            Optional<List<ParameterSymbol>> optParams = functionSymbol.typeDescriptor().params();
            if (optParams.isEmpty()) {
                return null;
            }
            return getTargetNodeForFunctionParam(optParams.get(), propertyKey, funcCallExprNode.arguments());
        } else if (initializer.kind() == SyntaxKind.CHECK_EXPRESSION && nodeKind == NodeKind.NEW_CONNECTION) {
            ExpressionNode expressionNode = ((CheckExpressionNode) initializer).expression();
            if (expressionNode.kind() != SyntaxKind.IMPLICIT_NEW_EXPRESSION) {
                return null;
            }
            TypeSymbol rawType = CommonUtils.getRawType(typeSymbol);
            if (rawType.kind() != SymbolKind.CLASS) {
                return null;
            }
            ClassSymbol classSymbol = (ClassSymbol) rawType;
            Optional<MethodSymbol> optInitMethodSymbol = classSymbol.initMethod();
            if (optInitMethodSymbol.isEmpty()) {
                return null;
            }
            MethodSymbol initMethodSymbol = optInitMethodSymbol.get();
            Optional<List<ParameterSymbol>> optParams = initMethodSymbol.typeDescriptor().params();
            if (optParams.isEmpty()) {
                return null;
            }
            ImplicitNewExpressionNode implicitNewExprNode = (ImplicitNewExpressionNode) expressionNode;
            Optional<ParenthesizedArgList> optParenthesizedArgList = implicitNewExprNode.parenthesizedArgList();
            if (optParenthesizedArgList.isEmpty()) {
                return new TargetNode(optParams.get().getFirst().typeDescriptor(), propertyKey, null);
            }
            return getTargetNodeForFunctionParam(optParams.get(), propertyKey,
                    optParenthesizedArgList.get().arguments());
        }

        if (targetField == null) {
            return new TargetNode(typeSymbol, variableSymbol.getName().get(), initializer);
        }

        if (initializer.kind() == SyntaxKind.QUERY_EXPRESSION) {
            if (typeSymbol.typeKind() != TypeDescKind.ARRAY) {
                return null;
            }
            typeSymbol = ((ArrayTypeSymbol) typeSymbol).memberTypeDescriptor();
            initializer = ((SelectClauseNode) ((QueryExpressionNode) initializer).resultClause()).expression();
        }

        if (initializer.kind() != SyntaxKind.MAPPING_CONSTRUCTOR) {
            return null;
        }
        typeSymbol = CommonUtils.getRawType(typeSymbol);
        if (typeSymbol.typeKind() != TypeDescKind.RECORD) {
            return null;
        }

        RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) typeSymbol;
        MappingConstructorExpressionNode mappingCtrExprNode = (MappingConstructorExpressionNode) initializer;

        String[] splits = targetField.split(DOT);
        if (!splits[0].equals(typedBindingPattern.bindingPattern().toSourceCode().trim())) {
            return null;
        }

        ExpressionNode expr = mappingCtrExprNode;
        ExpressionNode lastExpr = null;
        for (int i = 1; i < splits.length; i++) {
            String split = splits[i];
            if (expr.kind() != SyntaxKind.MAPPING_CONSTRUCTOR) {
                return null;
            }
            Map<String, SpecificFieldNode> mappingFieldsMap =
                    convertMappingFieldsToMap((MappingConstructorExpressionNode) expr);
            MappingFieldNode mappingFieldNode = mappingFieldsMap.get(split);
            if (mappingFieldNode == null) {
                break;
            }
            if (mappingFieldNode.kind() != SyntaxKind.SPECIFIC_FIELD) {
                break;
            }
            SpecificFieldNode specificFieldNode = (SpecificFieldNode) mappingFieldNode;
            Optional<ExpressionNode> optValueExpr = specificFieldNode.valueExpr();
            if (optValueExpr.isEmpty()) {
                break;
            }
            expr = optValueExpr.get();
            if (i == splits.length - 1) {
                lastExpr = expr;
            }
        }

        TypeSymbol ts = recordTypeSymbol;
        TypeSymbol lastTypeSymbol = null;
        for (int i = 1; i < splits.length; i++) {
            String split = splits[i];
            if (ts.typeKind() != TypeDescKind.RECORD) {
                break;
            }
            RecordTypeSymbol rts = (RecordTypeSymbol) ts;
            RecordFieldSymbol recordFieldSymbol = rts.fieldDescriptors().get(split);
            if (recordFieldSymbol == null) {
                break;
            }
            ts = CommonUtils.getRawType(recordFieldSymbol.typeDescriptor());
            if (i == splits.length - 1) {
                lastTypeSymbol = ts;
            }
        }
        if (lastTypeSymbol != null && lastTypeSymbol.typeKind() == TypeDescKind.ARRAY
                && lastExpr != null &&
                (lastExpr.kind() == SyntaxKind.QUERY_EXPRESSION || lastExpr.kind() == SyntaxKind.FIELD_ACCESS)) {
            return new TargetNode(lastTypeSymbol, splits[splits.length - 1], lastExpr);
        }
        return null;
    }

    private record TargetNode(TypeSymbol typeSymbol, String name, ExpressionNode expressionNode) {
    }

    private TargetNode getTargetNodeForFunctionParam(List<ParameterSymbol> paramSymbols, String propertyKey,
                                                     SeparatedNodeList<FunctionArgumentNode> args) {
        for (int i = 0; i < paramSymbols.size(); i++) {
            ParameterSymbol paramSymbol = paramSymbols.get(i);
            if (paramSymbol.getName().get().equals(propertyKey)) {
                return new TargetNode(paramSymbol.typeDescriptor(), propertyKey, getArgForParam(propertyKey, i, args));
            }
        }
        throw new IllegalStateException("Parameter is not available for : " + propertyKey);
    }

    private ExpressionNode getArgForParam(String param, int index, SeparatedNodeList<FunctionArgumentNode> args) {
        for (int i = 0; i < args.size(); i++) {
            FunctionArgumentNode arg = args.get(i);
            SyntaxKind kind = arg.kind();
            if (kind == SyntaxKind.POSITIONAL_ARG) {
                if (index == i) {
                    return ((PositionalArgumentNode) arg).expression();
                }
            } else if (kind == SyntaxKind.NAMED_ARG) {
                NamedArgumentNode namedArgumentNode = (NamedArgumentNode) arg;
                if (namedArgumentNode.argumentName().toSourceCode().equals(param)) {
                    return namedArgumentNode.expression();
                }
            }
        }
        return null;
    }

    private Map<String, SpecificFieldNode> convertMappingFieldsToMap(MappingConstructorExpressionNode mappingCtrExpr) {
        Map<String, SpecificFieldNode> mappingFieldNodeMap = new HashMap<>();
        mappingCtrExpr.fields().forEach(mappingFieldNode -> {
            if (mappingFieldNode.kind() == SyntaxKind.SPECIFIC_FIELD) {
                SpecificFieldNode specificFieldNode = (SpecificFieldNode) mappingFieldNode;
                mappingFieldNodeMap.put(specificFieldNode.fieldName().toSourceCode().trim(), specificFieldNode);
            }
        });
        return mappingFieldNodeMap;
    }

    private void generateRecordVariableDataMapping(ExpressionNode expressionNode, List<Mapping> mappings,
                                                   String name, SemanticModel semanticModel) {
        SyntaxKind exprKind = expressionNode.kind();
        if (exprKind == SyntaxKind.MAPPING_CONSTRUCTOR) {
            genMapping((MappingConstructorExpressionNode) expressionNode, mappings, name, semanticModel);
        } else {
            List<String> inputs = new ArrayList<>();
            genInputs(expressionNode, inputs);
            Mapping mapping = new Mapping(name, inputs, expressionNode.toSourceCode(),
                    getDiagnostics(expressionNode.lineRange(), semanticModel), new ArrayList<>());
            mappings.add(mapping);
        }
    }

    private void generateArrayVariableDataMapping(ExpressionNode expressionNode, List<Mapping> mappings,
                                                  String name, SemanticModel semanticModel) {
        SyntaxKind exprKind = expressionNode.kind();
        if (exprKind == SyntaxKind.LIST_CONSTRUCTOR) {
            genMapping((ListConstructorExpressionNode) expressionNode, mappings, name, semanticModel);
        } else if (exprKind == SyntaxKind.QUERY_EXPRESSION) {
            genMapping((QueryExpressionNode) expressionNode, mappings, name, semanticModel);
        } else {
            genMapping(expressionNode, name, mappings, semanticModel);
        }
    }

    private void genMapping(MappingConstructorExpressionNode mappingCtrExpr, List<Mapping> mappings, String name,
                            SemanticModel semanticModel) {
        for (MappingFieldNode field : mappingCtrExpr.fields()) {
            if (field.kind() == SyntaxKind.SPECIFIC_FIELD) {
                SpecificFieldNode f = (SpecificFieldNode) field;
                Optional<ExpressionNode> optFieldExpr = f.valueExpr();
                if (optFieldExpr.isEmpty()) {
                    continue;
                }
                ExpressionNode fieldExpr = optFieldExpr.get();
                SyntaxKind kind = fieldExpr.kind();
                if (kind == SyntaxKind.MAPPING_CONSTRUCTOR) {
                    genMapping((MappingConstructorExpressionNode) fieldExpr, mappings,
                            name + "." + f.fieldName().toSourceCode().trim(), semanticModel);
                } else if (kind == SyntaxKind.LIST_CONSTRUCTOR) {
                    genMapping((ListConstructorExpressionNode) fieldExpr, mappings, name + "." +
                            f.fieldName().toSourceCode().trim(), semanticModel);
                } else {
                    genMapping(fieldExpr, name + "." + f.fieldName().toSourceCode().trim(), mappings, semanticModel);
                }
            }
        }
    }

    private void genMapping(ListConstructorExpressionNode listCtrExpr, List<Mapping> mappings, String name,
                            SemanticModel semanticModel) {
        SeparatedNodeList<Node> expressions = listCtrExpr.expressions();
        int size = expressions.size();
        List<MappingElements> mappingElements = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            List<Mapping> elements = new ArrayList<>();
            Node expr = expressions.get(i);
            if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                genMapping((MappingConstructorExpressionNode) expr, elements, name + "." + i, semanticModel);
            } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
                genMapping((ListConstructorExpressionNode) expr, elements, name + "." + i, semanticModel);
            } else {
                genMapping(expr, name + "." + i, elements, semanticModel);
            }
            mappingElements.add(new MappingElements(elements));
        }
        Mapping mapping = new Mapping(name, new ArrayList<>(), listCtrExpr.toSourceCode(),
                getDiagnostics(listCtrExpr.lineRange(), semanticModel), mappingElements);
        mappings.add(mapping);
    }

    private void genMapping(Node expr, String name, List<Mapping> elements, SemanticModel semanticModel) {
        List<String> inputs = new ArrayList<>();
        genInputs(expr, inputs);
        Mapping mapping = new Mapping(name, inputs, expr.toSourceCode(),
                getDiagnostics(expr.lineRange(), semanticModel), new ArrayList<>(),
                expr.kind() == SyntaxKind.QUERY_EXPRESSION);
        elements.add(mapping);
    }

    private void genMapping(QueryExpressionNode queryExpr, List<Mapping> mappings, String name,
                            SemanticModel semanticModel) {
        ClauseNode clauseNode = queryExpr.resultClause();
        if (clauseNode.kind() != SyntaxKind.SELECT_CLAUSE) {
            return;
        }
        SelectClauseNode selectClauseNode = (SelectClauseNode) clauseNode;
        ExpressionNode expr = selectClauseNode.expression();
        if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
            genMapping((MappingConstructorExpressionNode) expr, mappings, name, semanticModel);
        } else {
            genMapping(expr, name, mappings, semanticModel);
        }
    }

    private void genInputs(Node expr, List<String> inputs) {
        SyntaxKind kind = expr.kind();
        if (kind == SyntaxKind.FIELD_ACCESS) {
            String source = expr.toSourceCode().trim();
            String[] split = source.split("\\[");
            if (split.length > 1) {
                inputs.add(split[0]);
            } else {
                inputs.add(source);
            }
        } else if (kind == SyntaxKind.SIMPLE_NAME_REFERENCE) {
            inputs.add(expr.toSourceCode().trim());
        } else if (kind == SyntaxKind.BINARY_EXPRESSION) {
            BinaryExpressionNode binaryExpr = (BinaryExpressionNode) expr;
            genInputs(binaryExpr.lhsExpr(), inputs);
            genInputs(binaryExpr.rhsExpr(), inputs);
        } else if (kind == SyntaxKind.METHOD_CALL) {
            MethodCallExpressionNode methodCallExpr = (MethodCallExpressionNode) expr;
            genInputs(methodCallExpr.expression(), inputs);
        } else if (kind == SyntaxKind.MAPPING_CONSTRUCTOR) {
            MappingConstructorExpressionNode mappingCtrExpr = (MappingConstructorExpressionNode) expr;
            for (MappingFieldNode field : mappingCtrExpr.fields()) {
                SyntaxKind fieldKind = field.kind();
                if (fieldKind == SyntaxKind.SPECIFIC_FIELD) {
                    Optional<ExpressionNode> optFieldExpr = ((SpecificFieldNode) field).valueExpr();
                    optFieldExpr.ifPresent(expressionNode -> genInputs(expressionNode, inputs));
                } else {
                    genInputs(field, inputs);
                }
            }
        } else if (kind == SyntaxKind.INDEXED_EXPRESSION) {
            String source = expr.toSourceCode().trim();
            inputs.add(source.replace("[", ".").substring(0, source.length() - 1));
        } else if (kind == SyntaxKind.QUERY_EXPRESSION) {
            QueryExpressionNode queryExpr = (QueryExpressionNode) expr;
            inputs.add(queryExpr.queryPipeline().fromClause().expression().toSourceCode().trim());
        }
    }

    private List<String> getDiagnostics(LineRange lineRange, SemanticModel semanticModel) {
        List<String> diagnosticMsgs = new ArrayList<>();
        for (Diagnostic diagnostic : semanticModel.diagnostics(lineRange)) {
            diagnosticMsgs.add(diagnostic.message());
        }
        return diagnosticMsgs;
    }

    private List<MappingPort> getInputPorts(SemanticModel semanticModel, Document document, LinePosition position) {
        List<MappingPort> mappingPorts = new ArrayList<>();

        List<Symbol> symbols = semanticModel.visibleSymbols(document, position);
        for (Symbol symbol : symbols) {
            SymbolKind kind = symbol.kind();
            if (kind == SymbolKind.VARIABLE) {
                Optional<String> optName = symbol.getName();
                if (optName.isEmpty()) {
                    continue;
                }
                Type type = Type.fromSemanticSymbol(symbol);
                MappingPort mappingPort = getMappingPort(optName.get(), optName.get(), type, true);
                if (mappingPort == null) {
                    continue;
                }
                VariableSymbol varSymbol = (VariableSymbol) symbol;
                if (varSymbol.qualifiers().contains(Qualifier.CONFIGURABLE)) {
                    mappingPort.category = "configurable";
                } else {
                    mappingPort.category = "variable";
                }
                mappingPorts.add(mappingPort);
            } else if (kind == SymbolKind.PARAMETER) {
                Optional<String> optName = symbol.getName();
                if (optName.isEmpty()) {
                    continue;
                }
                Type type = Type.fromSemanticSymbol(symbol);
                MappingPort mappingPort = getMappingPort(optName.get(), optName.get(), type, true);
                if (mappingPort == null) {
                    continue;
                }
                mappingPort.category = "parameter";
                mappingPorts.add(mappingPort);
            } else if (kind == SymbolKind.CONSTANT) {
                Type type = Type.fromSemanticSymbol(symbol);
                MappingPort mappingPort = getMappingPort(type.getTypeName(), type.getTypeName(), type, true);
                if (mappingPort == null) {
                    continue;
                }
                mappingPort.category = "constant";
                mappingPorts.add(mappingPort);
            }
        }
        return mappingPorts;
    }

    private MappingPort getMappingPort(String id, String name, Type type, boolean isInputPort) {
        if (type.getTypeName().equals("record")) {
            RecordType recordType = (RecordType) type;
            TypeInfo typeInfo = type.getTypeInfo();
            MappingRecordPort recordPort = new MappingRecordPort(id, name, typeInfo != null ?
                    typeInfo.name : type.getTypeName(), type.getTypeName());
            for (Type field : recordType.fields) {
                recordPort.fields.add(getMappingPort(id + "." + field.getName(), field.getName(), field, isInputPort));
            }
            return recordPort;
        } else if (type instanceof PrimitiveType) {
            return new MappingPort(id, type.getName(), type.getTypeName(), type.getTypeName());
        } else if (type.getTypeName().equals("array")) {
            ArrayType arrayType = (ArrayType) type;
            MappingPort memberPort = getMappingPort(isInputPort ? id + ".0" : id, null, arrayType.memberType,
                    isInputPort);
            MappingArrayPort arrayPort = new MappingArrayPort(id, name, memberPort == null ? "record" :
                    memberPort.typeName + "[]", type.getTypeName());
            arrayPort.setMember(memberPort);
            return arrayPort;
        } else {
            return null;
        }
    }

    public JsonElement getSource(Path filePath, JsonElement cd, JsonElement mp, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        Mapping mapping = gson.fromJson(mp, Mapping.class);

        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        LineRange lineRange = codedata.lineRange();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        NonTerminalNode node = modulePartNode.findNode(TextRange.from(start, end - start), true);

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        if (node.kind() == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode varDecl = (VariableDeclarationNode) node;
            String output = mapping.output();
            String[] splits = output.split(DOT);
            ExpressionNode expr = getMappingExpr(varDecl.initializer().orElseThrow(), targetField);
            StringBuilder sb = new StringBuilder();
            genSource(expr, splits, 1, sb, mapping.expression(), null, textEdits);
        } else if (node.kind() == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVarDecl = (ModuleVariableDeclarationNode) node;
            String output = mapping.output();
            String[] splits = output.split(DOT);
            ExpressionNode expr = getMappingExpr(moduleVarDecl.initializer().orElseThrow(), targetField);
            StringBuilder sb = new StringBuilder();
            genSource(expr, splits, 1, sb, mapping.expression(), null, textEdits);
        }
        return gson.toJsonTree(textEditsMap);
    }

    private void genSource(ExpressionNode expr, String[] names, int idx, StringBuilder stringBuilder,
                           String mappingExpr, LinePosition position, List<TextEdit> textEdits) {
        if (expr == null) {
            String name = names[idx];
            if (name.matches("\\d+")) {
                stringBuilder.append(mappingExpr);
            } else {
                stringBuilder.append(name).append(": ");
                for (int i = idx + 1; i < names.length; i++) {
                    stringBuilder.append("{").append(names[i]).append(": ");
                }
                stringBuilder.append(mappingExpr);
                for (int i = idx + 1; i < names.length; i++) {
                    stringBuilder.append("}");
                }
            }
            textEdits.add(new TextEdit(CommonUtils.toRange(position), stringBuilder.toString()));
        } else if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
            String name = names[idx];
            MappingConstructorExpressionNode mappingCtrExpr = (MappingConstructorExpressionNode) expr;
            Map<String, SpecificFieldNode> mappingFields = convertMappingFieldsToMap(mappingCtrExpr);
            SpecificFieldNode mappingFieldNode = mappingFields.get(name);
            if (mappingFieldNode == null) {
                if (!mappingFields.isEmpty()) {
                    stringBuilder.append(", ");
                }
                genSource(null, names, idx, stringBuilder, mappingExpr,
                        mappingCtrExpr.closeBrace().lineRange().startLine(), textEdits);
            } else {
                genSource(mappingFieldNode.valueExpr().orElseThrow(), names, idx + 1, stringBuilder, mappingExpr,
                        null, textEdits);
            }
        } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
            ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) expr;
            if (idx == names.length) {
                textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), mappingExpr));
            } else {
                String name = names[idx];
                if (name.matches("\\d+")) {
                    int index = Integer.parseInt(name);
                    if (index >= listCtrExpr.expressions().size()) {
                        if (idx > 0) {
                            stringBuilder.append(", ");
                        }
                        genSource(null, names, idx, stringBuilder, mappingExpr,
                                listCtrExpr.closeBracket().lineRange().startLine(), textEdits);
                    } else {
                        genSource((ExpressionNode) listCtrExpr.expressions().get(index), names, idx + 1, stringBuilder,
                                mappingExpr, null, textEdits);
                    }
                }
            }
        } else {
            // TODO: check to move this out of if-else and move up
            if (idx == names.length) {
               textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), mappingExpr));
            }
        }
    }

    private ExpressionNode getMappingExpr(ExpressionNode expr, String targetField) {
        if (targetField == null) {
            return expr;
        }
        String[] splits = targetField.split(DOT);
        ExpressionNode mappingExpr = expr;
        for (int i = 1; i < splits.length; i++) {
            if (mappingExpr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                MappingConstructorExpressionNode mappingCtrExprNode = (MappingConstructorExpressionNode) mappingExpr;
                Map<String, SpecificFieldNode> fields = convertMappingFieldsToMap(mappingCtrExprNode);
                mappingExpr = fields.get(splits[i]).valueExpr().orElseThrow();
            } else if (mappingExpr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
                ListConstructorExpressionNode listCtrExprNode = (ListConstructorExpressionNode) mappingExpr;
                String name = splits[i];
                if (name.matches("\\d+")) {
                    int index = Integer.parseInt(name);
                    if (index >= listCtrExprNode.expressions().size()) {
                        throw new IllegalArgumentException("Index out of bounds: " + index);
                    }
                    mappingExpr = (ExpressionNode) listCtrExprNode.expressions().get(index);
                }
            } else if (mappingExpr.kind() == SyntaxKind.QUERY_EXPRESSION) {
                QueryExpressionNode queryExpr = (QueryExpressionNode) mappingExpr;
                ClauseNode clauseNode = queryExpr.resultClause();
                if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                    mappingExpr = ((SelectClauseNode) clauseNode).expression();
                    if (mappingExpr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                        MappingConstructorExpressionNode mappingCtrExprNode =
                                (MappingConstructorExpressionNode) mappingExpr;
                        Map<String, SpecificFieldNode> fields = convertMappingFieldsToMap(mappingCtrExprNode);
                        mappingExpr = fields.get(splits[i]).valueExpr().orElseThrow();
                    }
                }
            }
        }

        if (mappingExpr.kind() == SyntaxKind.QUERY_EXPRESSION) {
            QueryExpressionNode queryExpr = (QueryExpressionNode) mappingExpr;
            ClauseNode clauseNode = queryExpr.resultClause();
            if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                return ((SelectClauseNode) clauseNode).expression();
            }
        }
        return mappingExpr;
    }

    public JsonElement addClauses(Path filePath, JsonElement cd, JsonElement cl, int index, String targetField) {
        Clause clause = gson.fromJson(cl, Clause.class);
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        if (codedata.node() != NodeKind.VARIABLE) {
            return null;
        }

        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        LineRange lineRange = codedata.lineRange();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        NonTerminalNode node = modulePartNode.findNode(TextRange.from(start, end - start), true);

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        if (node.kind() == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode varDecl = (VariableDeclarationNode) node;
            QueryExpressionNode queryExpr = getQueryExpr(varDecl.initializer().orElseThrow(), targetField);
            String clauseStr = genClause(clause);
            NodeList<IntermediateClauseNode> intermediateClauseNodes = queryExpr.queryPipeline().intermediateClauses();
            if (codedata.isNew() != null && codedata.isNew()) {
                clauseStr = System.lineSeparator() + clauseStr;
                if (intermediateClauseNodes == null || intermediateClauseNodes.isEmpty()) {
                    textEdits.add(new TextEdit(CommonUtils.toRange(
                            queryExpr.queryPipeline().fromClause().lineRange().endLine()), clauseStr));
                } else {
                    textEdits.add(new TextEdit(CommonUtils.toRange(
                            intermediateClauseNodes.get(index).lineRange().endLine()), clauseStr));
                }
            } else {
                textEdits.add(new TextEdit(CommonUtils.toRange(
                        intermediateClauseNodes.get(index).lineRange()), clauseStr));
            }
        }

        return gson.toJsonTree(textEditsMap);
    }

    private QueryExpressionNode getQueryExpr(ExpressionNode expressionNode, String targetField) {
        if (targetField == null) {
            if (expressionNode.kind() == SyntaxKind.QUERY_EXPRESSION) {
                return (QueryExpressionNode) expressionNode;
            }
            throw new IllegalArgumentException("Expression is not a query expression: " + expressionNode.kind());
        }

        String[] splits = targetField.split(DOT);
        ExpressionNode expr = expressionNode;
        for (int i = 1; i < splits.length; i++) {
            if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                MappingConstructorExpressionNode mappingCtrExprNode = (MappingConstructorExpressionNode) expr;
                Map<String, SpecificFieldNode> fields = convertMappingFieldsToMap(mappingCtrExprNode);
                expr = fields.get(splits[i]).valueExpr().orElseThrow();
            } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
                ListConstructorExpressionNode listCtrExprNode = (ListConstructorExpressionNode) expr;
                String name = splits[i];
                if (name.matches("\\d+")) {
                    int index = Integer.parseInt(name);
                    if (index >= listCtrExprNode.expressions().size()) {
                        throw new IllegalArgumentException("Index out of bounds: " + index);
                    }
                    expr = (ExpressionNode) listCtrExprNode.expressions().get(index);
                }
            } else if (expr.kind() == SyntaxKind.QUERY_EXPRESSION) {
                QueryExpressionNode queryExpr = (QueryExpressionNode) expr;
                ClauseNode clauseNode = queryExpr.resultClause();
                if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                    expr = ((SelectClauseNode) clauseNode).expression();
                    if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                        MappingConstructorExpressionNode mappingCtrExprNode =
                                (MappingConstructorExpressionNode) expr;
                        Map<String, SpecificFieldNode> fields = convertMappingFieldsToMap(mappingCtrExprNode);
                        expr = fields.get(splits[i]).valueExpr().orElseThrow();
                    }
                }
            }
        }

        if (expr.kind() == SyntaxKind.QUERY_EXPRESSION) {
            return (QueryExpressionNode) expr;
        }
        throw new IllegalArgumentException("Expression is not a query expression: " + expr.kind());
    }

    private String genClause(Clause clause) {
        String type = clause.type();
        Properties properties = clause.properties();
        switch (type) {
            case "from": {
                return "from " + properties.type() + " " + properties.name() +
                        " in " + properties.expression();
            }
            case "where": {
                return "where " + properties.expression();
            }
            case "order-by": {
                String orderBy = "order by " + properties.expression();
                if (properties.order() != null) {
                    orderBy += " " + properties.order();
                }
                return orderBy;
            }
            case "let": {
                return "let " + properties.type() + " " + properties.name() +
                        " = " + properties.expression();
            }
            case "limit": {
                return "limit " + properties.expression();
            }
            case "select": {
                return "select " + properties.expression();
            }
            case "collect": {
                return "collect " + properties.expression();
            }
            default:
                throw new IllegalStateException("Unknown clause type: " + type);
        }
    }

    public JsonElement getQuery(SemanticModel semanticModel, JsonElement cd, String targetField, Path filePath) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);

        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        LineRange lineRange = codedata.lineRange();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        NonTerminalNode stNode = modulePartNode.findNode(TextRange.from(start, end - start), true);

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        TargetNode targetNode = getTargetNode(stNode, targetField, codedata.node(), null, semanticModel);
        if (targetNode != null) {
            TypeSymbol targetTypeSymbol = CommonUtils.getRawType(targetNode.typeSymbol());
            if (targetTypeSymbol.typeKind() == TypeDescKind.ARRAY) {
                TypeSymbol typeSymbol =
                        CommonUtils.getRawType(((ArrayTypeSymbol) targetTypeSymbol).memberTypeDescriptor());
                if (typeSymbol.typeKind() == TypeDescKind.RECORD) {
                    String query = getQuerySource(targetNode.expressionNode(), (RecordTypeSymbol) typeSymbol);
                    textEdits.add(new TextEdit(CommonUtils.toRange(targetNode.expressionNode().lineRange()), query));
                }

            }
        }

        return gson.toJsonTree(textEditsMap);
    }

    private SourceModification applyNode(FlowNode flowNode, Project project, Path filePath, LinePosition position) {
        SourceBuilder sourceBuilder = new SourceBuilder(flowNode, this.workspaceManager, filePath);
        String source = NodeBuilder.getNodeFromKind(flowNode.codedata().node())
                .toSource(sourceBuilder).entrySet().stream().iterator().next().getValue().get(0).getNewText();
        TextDocument textDocument = document.textDocument();
        int startTextPosition = textDocument.textPositionFrom(position);
        io.ballerina.tools.text.TextEdit textEdit =
                io.ballerina.tools.text.TextEdit.from(TextRange.from(startTextPosition,
                        0), source);
        io.ballerina.tools.text.TextEdit[] textEdits = {textEdit};
        TextDocument modifiedTextDoc = textDocument.apply(TextDocumentChange.from(textEdits));
        Document modifiedDoc =
                project.duplicate().currentPackage().module(document.module().moduleId())
                        .document(document.documentId()).modify().withContent(String.join(System.lineSeparator(),
                                modifiedTextDoc.textLines())).apply();

        SemanticModel newSemanticModel = PackageUtil.getCompilation(modifiedDoc.module().packageInstance())
                .getSemanticModel(modifiedDoc.module().moduleId());
        LinePosition startLine = modifiedTextDoc.linePositionFrom(startTextPosition);
        LinePosition endLine = modifiedTextDoc.linePositionFrom(startTextPosition + source.length());
        Range range = new Range(new Position(startLine.line(), startLine.offset()),
                new Position(endLine.line(), endLine.offset()));
        NonTerminalNode stNode = CommonUtil.findNode(range, modifiedDoc.syntaxTree());

        return new SourceModification(source, modifiedDoc, newSemanticModel, stNode);
    }

    private SourceModification applyConnection(FlowNode flowNode, Project project, Path filePath) {
        SourceBuilder sourceBuilder = new SourceBuilder(flowNode, this.workspaceManager, filePath);
        Path connectionPath = workspaceManager.projectRoot(filePath).resolve("connections.bal");
        List<TextEdit> connectionTextEdits =
                NodeBuilder.getNodeFromKind(flowNode.codedata().node()).toSource(sourceBuilder).get(connectionPath);
        Document document = workspaceManager.document(connectionPath).orElseThrow();
        TextDocument textDocument = document.textDocument();
        io.ballerina.tools.text.TextEdit[] textEdits = new io.ballerina.tools.text.TextEdit[connectionTextEdits.size()];
        for (int i = 0; i < connectionTextEdits.size(); i++) {
            TextEdit connectionTextEdit = connectionTextEdits.get(i);
            Position start = connectionTextEdit.getRange().getStart();
            int startTextPosition = textDocument.textPositionFrom(LinePosition.from(start.getLine(),
                    start.getCharacter()));
            Position end = connectionTextEdit.getRange().getEnd();
            int endTextPosition = textDocument.textPositionFrom(LinePosition.from(end.getLine(), end.getCharacter()));
            io.ballerina.tools.text.TextEdit textEdit =
                    io.ballerina.tools.text.TextEdit.from(TextRange.from(startTextPosition,
                            endTextPosition - startTextPosition), connectionTextEdit.getNewText());
            textEdits[i] = textEdit;
        }
        TextDocument modifiedTextDoc = textDocument.apply(TextDocumentChange.from(textEdits));
        Document modifiedDoc =
                project.duplicate().currentPackage().module(document.module().moduleId())
                        .document(document.documentId()).modify().withContent(String.join(System.lineSeparator(),
                                modifiedTextDoc.textLines())).apply();

        Optional<Property> optVariable = flowNode.getProperty("variable");
        if (optVariable.isEmpty()) {
            throw new IllegalStateException("Variable cannot be found for the connection");
        }
        SemanticModel newSemanticModel = PackageUtil.getCompilation(modifiedDoc.module().packageInstance())
                .getSemanticModel(modifiedDoc.module().moduleId());
        return new SourceModification("", modifiedDoc, newSemanticModel, connectionNode(modifiedDoc,
                optVariable.get().toSourceCode()));
    }

    private Node connectionNode(Document document, String connectionName) {
        ModulePartNode modulePartNode = document.syntaxTree().rootNode();
        NodeList<ModuleMemberDeclarationNode> members = modulePartNode.members();
        for (ModuleMemberDeclarationNode member : members) {
            if (member.kind() == SyntaxKind.MODULE_VAR_DECL) {
                ModuleVariableDeclarationNode varDecl = (ModuleVariableDeclarationNode) member;
                if (varDecl.typedBindingPattern().bindingPattern().toSourceCode().trim().equals(connectionName)) {
                    return varDecl;
                }
            }
        }
        return null;
    }

    private record SourceModification(String source, Document document, SemanticModel semanticModel, Node stNode) {
    }

    private String getQuerySource(NonTerminalNode inputExpr, RecordTypeSymbol recordTypeSymbol) {
        String name = "item";
        SyntaxKind kind = inputExpr.kind();
        if (kind == SyntaxKind.SIMPLE_NAME_REFERENCE) {
            name = inputExpr.toSourceCode() + "Item";
        } else if (kind == SyntaxKind.FIELD_ACCESS) {
            FieldAccessExpressionNode fieldAccessExpr = (FieldAccessExpressionNode) inputExpr;
            name = fieldAccessExpr.fieldName().toSourceCode() + "Item";
        }
        return "from var " + name + " in " + inputExpr.toSourceCode() + " " +
                SyntaxKind.SELECT_KEYWORD.stringValue() + " " +
                DefaultValueGeneratorUtil.getDefaultValueForType(recordTypeSymbol);
    }

    public JsonElement getVisualizableProperties(JsonElement node, Project project, Path filePath,
                                                 LinePosition position) {
        FlowNode flowNode = gson.fromJson(node, FlowNode.class);
        List<String> visualizableProperties = new ArrayList<>();
        NodeKind nodeKind = flowNode.codedata().node();
        if (nodeKind == NodeKind.VARIABLE) {
            SourceModification sourceModification = applyNode(flowNode, project, filePath, position);
            Node stNode = sourceModification.stNode();
            if (stNode.kind() != SyntaxKind.LOCAL_VAR_DECL) {
                throw new IllegalStateException("Node is not a variable declaration");
            }
            Optional<Symbol> optVarSymbol = sourceModification.semanticModel().symbol(stNode);
            if (optVarSymbol.isEmpty()) {
                throw new IllegalStateException("Symbol cannot be found for the variable declaration");
            }
            VariableSymbol variableSymbol = (VariableSymbol) optVarSymbol.get();
            if (isEffectiveRecordType(variableSymbol.typeDescriptor())) {
                visualizableProperties.add("expression");
            }
        } else if (nodeKind == NodeKind.NEW_CONNECTION) {
            SourceModification sourceModification = applyConnection(flowNode, project, filePath);
            Optional<Property> optVariable = flowNode.getProperty("variable");
            if (optVariable.isEmpty()) {
                throw new IllegalStateException("Variable cannot be found for the connection");
            }
            List<Symbol> symbols = sourceModification.semanticModel().moduleSymbols();
            String variableName = optVariable.get().toSourceCode();
            Optional<Symbol> optVariableSymbol = symbols.parallelStream()
                    .filter(symbol -> symbol.getName().isPresent() && symbol.getName().get().equals(variableName))
                    .findAny();
            if (optVariableSymbol.isEmpty()) {
                throw new IllegalStateException("Symbol cannot be found for the connection variable");
            }

            VariableSymbol variableSymbol = (VariableSymbol) optVariableSymbol.get();
            TypeSymbol typeSymbol = CommonUtils.getRawType(variableSymbol.typeDescriptor());
            if (typeSymbol.kind() != SymbolKind.CLASS) {
                throw new IllegalStateException("Connection symbol is not a class symbol");
            }
            ClassSymbol classSymbol = (ClassSymbol) typeSymbol;
            Optional<MethodSymbol> optInitMethodSymbol = classSymbol.initMethod();
            if (optInitMethodSymbol.isEmpty()) {
                throw new IllegalStateException("Init method cannot be found for the connection class");
            }
            MethodSymbol initMethodSymbol = optInitMethodSymbol.get();
            Optional<List<ParameterSymbol>> optParams = initMethodSymbol.typeDescriptor().params();
            if (optParams.isPresent()) {
                List<ParameterSymbol> params = optParams.get();
                for (ParameterSymbol param : params) {
                    if (isEffectiveRecordType(param.typeDescriptor())) {
                        visualizableProperties.add(param.getName().get());
                    }
                }
            }
        }
        return gson.toJsonTree(visualizableProperties);
    }

    private boolean isEffectiveRecordType(TypeSymbol typeSymbol) {
        TypeSymbol rawTypeSymbol = CommonUtils.getRawType(typeSymbol);
        TypeDescKind kind = rawTypeSymbol.typeKind();
        if (kind == TypeDescKind.ARRAY) {
            return isEffectiveRecordType(((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor());
        }
        return kind == TypeDescKind.RECORD;
    }

    public JsonElement addElement(SemanticModel semanticModel, JsonElement cd, Path filePath, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);

        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        LineRange lineRange = codedata.lineRange();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        NonTerminalNode stNode = modulePartNode.findNode(TextRange.from(start, end - start), true);

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        if (stNode.kind() == SyntaxKind.LOCAL_VAR_DECL) {
            Optional<Symbol> symbol = semanticModel.symbol(stNode);
            if (symbol.isEmpty()) {
                throw new IllegalStateException("Symbol cannot be found for the variable declaration");
            }
            TypeSymbol targetType = getTargetType(((VariableSymbol) symbol.get()).typeDescriptor(), targetField);
            if (targetType == null) {
                throw new IllegalStateException("Target type cannot be found for the variable declaration");
            }
            if (targetType.typeKind() == TypeDescKind.ARRAY) {
                targetType = ((ArrayTypeSymbol) targetType).memberTypeDescriptor();
            }
            String defaultVal = DefaultValueGeneratorUtil.getDefaultValueForType(targetType);

            VariableDeclarationNode varDeclNode = (VariableDeclarationNode) stNode;
            if (varDeclNode.initializer().isEmpty()) {
                return null;
            }
            ExpressionNode initializer = varDeclNode.initializer().get();
            ExpressionNode expr = getArrayExpr(targetField, initializer);
            if (expr == null || expr.kind() != SyntaxKind.LIST_CONSTRUCTOR) {
                throw new IllegalStateException("Expression is not a list constructor");
            }
            ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) expr;
            SeparatedNodeList<Node> expressions = listCtrExpr.expressions();
            if (expressions == null || expressions.isEmpty()) {
                textEdits.add(new TextEdit(CommonUtils.toRange(listCtrExpr.openBracket().lineRange().endLine()),
                        defaultVal));
            } else {
                defaultVal = ", " + defaultVal;
                textEdits.add(new TextEdit(CommonUtils.toRange(
                        expressions.get(expressions.size() - 1).lineRange().endLine()), defaultVal));
            }
        }
        return gson.toJsonTree(textEditsMap);
    }

    private ExpressionNode getArrayExpr(String targetField, ExpressionNode expr) {
        String[] splits = targetField.split(DOT);
        ExpressionNode currentExpr = expr;
        for (int i = 1; i < splits.length; i++) {
            String split = splits[i];
            if (split.matches("\\d+")) {
                if (currentExpr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
                    ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) currentExpr;
                    SeparatedNodeList<Node> expressions = listCtrExpr.expressions();
                    int size = expressions.size();
                    int index = Integer.parseInt(split);
                    if (index >= size) {
                        return null;
                    }
                    currentExpr = (ExpressionNode) expressions.get(index);
                }
            } else if (currentExpr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                MappingConstructorExpressionNode mappingCtrExpr = (MappingConstructorExpressionNode) currentExpr;
                for (MappingFieldNode field : mappingCtrExpr.fields()) {
                    if (field.kind() == SyntaxKind.SPECIFIC_FIELD) {
                        SpecificFieldNode specificFieldNode = (SpecificFieldNode) field;
                        if (specificFieldNode.fieldName().toSourceCode().trim().equals(split)) {
                            Optional<ExpressionNode> optFieldExpr = specificFieldNode.valueExpr();
                            if (optFieldExpr.isEmpty()) {
                                return null;
                            }
                            currentExpr = optFieldExpr.get();
                        }
                    }
                }
            }
        }
        return currentExpr;
    }

    private TypeSymbol getTargetType(TypeSymbol typeSymbol, String targetField) {
        if (targetField == null || targetField.isEmpty()) {
            return typeSymbol;
        }
        String[] splits = targetField.split(DOT);
        if (splits.length == 1) {
            return typeSymbol;
        }

        TypeSymbol targetType = typeSymbol;
        for (int i = 1; i < splits.length; i++) {
            targetType = CommonUtils.getRawType(targetType);
            String split = splits[i];
            if (split.matches("\\d+")) {
                if (targetType.typeKind() != TypeDescKind.ARRAY) {
                    return null;
                }
                targetType = ((ArrayTypeSymbol) targetType).memberTypeDescriptor();
            } else {
                if (targetType.typeKind() != TypeDescKind.RECORD) {
                    return null;
                }
                RecordFieldSymbol recordFieldSymbol = ((RecordTypeSymbol) targetType).fieldDescriptors().get(split);
                targetType = recordFieldSymbol.typeDescriptor();
            }
        }
        return targetType;
    }

    private List<IntermediateClause> getQueryIntermediateClause(QueryPipelineNode queryPipelineNode) {
        List<IntermediateClause> intermediateClauses = new ArrayList<>();
        for (IntermediateClauseNode intermediateClause : queryPipelineNode.intermediateClauses()) {
            SyntaxKind kind = intermediateClause.kind();
            switch (kind) {
                case FROM_CLAUSE -> {
                    FromClauseNode fromClauseNode = (FromClauseNode) intermediateClause;
                    TypedBindingPatternNode typedBindingPattern = fromClauseNode.typedBindingPattern();
                    FromClause fromClause = new FromClause(typedBindingPattern.typeDescriptor().toSourceCode().trim(),
                            typedBindingPattern.bindingPattern().toSourceCode().trim(),
                            fromClauseNode.expression().toSourceCode().trim());
                    intermediateClauses.add(new IntermediateClause("from", fromClause));
                }
                case WHERE_CLAUSE -> {
                    WhereClauseNode whereClauseNode = (WhereClauseNode) intermediateClause;
                    ExpressionNode expression = whereClauseNode.expression();
                    intermediateClauses.add(new IntermediateClause("where", expression.toSourceCode().trim()));
                }
                default -> {
                }
            }
        }
        return intermediateClauses;
    }

    private record Model(List<MappingPort> inputs, MappingPort output, List<MappingPort> subMappings,
                         List<Mapping> mappings, Query query) {

        private Model(List<MappingPort> inputs, MappingPort output, List<Mapping> mappings) {
            this(inputs, output, null, mappings, null);
        }

        private Model(List<MappingPort> inputs, MappingPort output, Query query) {
            this(inputs, output, null, new ArrayList<>(), query);
        }

        private Model(List<MappingPort> inputs, MappingPort output, List<Mapping> mappings, Query query) {
            this(inputs, output, null, mappings, query);
        }
    }

    private record Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                           List<MappingElements> elements, Boolean isQueryExpression) {

        private Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                        List<MappingElements> elements) {
            this(output, inputs, expression, diagnostics, elements, null);
        }
    }

    private record Query(String output, List<String> inputs, FromClause fromClause,
                         List<IntermediateClause> intermediateClauses, String resultClause) {

    }

    private record FromClause(String type, String name, String expression) {

    }

    private record IntermediateClause(String type, Object clause) {

    }

    private record Properties(String name, String type, String expression, String order) {

    }

    private record Clause(String type, Properties properties) {

    }

    private record MappingElements(List<Mapping> mappings) {

    }

    private static class MappingPort {
        String id;
        String variableName;
        String typeName;
        String kind;
        String category;

        MappingPort(String id, String variableName, String typeName, String kind) {
            this.id = id;
            this.variableName = variableName;
            this.typeName = typeName;
            this.kind = kind;
        }

        String getCategory() {
            return this.category;
        }

        String getKind() {
            return this.kind;
        }

        void setKind(String kind) {
            this.kind = kind;
        }

        String getVariableName() {
            return this.variableName;
        }

        void setVariableName(String variableName) {
            this.variableName = variableName;
        }
    }

    private static class MappingRecordPort extends MappingPort {
        List<MappingPort> fields = new ArrayList<>();

        MappingRecordPort(String id, String variableName, String typeName, String kind) {
            super(id, variableName, typeName, kind);
        }
    }

    private static class MappingArrayPort extends MappingPort {
        MappingPort member;

        MappingArrayPort(String id, String variableName, String typeName, String kind) {
            super(id, variableName, typeName, kind);
        }

        MappingPort getMember() {
            return this.member;
        }

        void setMember(MappingPort member) {
            this.member = member;
        }
    }
}
