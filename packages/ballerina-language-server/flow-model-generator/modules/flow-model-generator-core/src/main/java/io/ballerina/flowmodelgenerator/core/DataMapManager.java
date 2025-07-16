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
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.BinaryExpressionNode;
import io.ballerina.compiler.syntax.tree.ClauseNode;
import io.ballerina.compiler.syntax.tree.CollectClauseNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FieldAccessExpressionNode;
import io.ballerina.compiler.syntax.tree.FromClauseNode;
import io.ballerina.compiler.syntax.tree.ImportDeclarationNode;
import io.ballerina.compiler.syntax.tree.IntermediateClauseNode;
import io.ballerina.compiler.syntax.tree.LetClauseNode;
import io.ballerina.compiler.syntax.tree.LetExpressionNode;
import io.ballerina.compiler.syntax.tree.LetVariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.LimitClauseNode;
import io.ballerina.compiler.syntax.tree.ListConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingFieldNode;
import io.ballerina.compiler.syntax.tree.MethodCallExpressionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.ModuleVariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.OrderByClauseNode;
import io.ballerina.compiler.syntax.tree.OrderKeyNode;
import io.ballerina.compiler.syntax.tree.QueryExpressionNode;
import io.ballerina.compiler.syntax.tree.QueryPipelineNode;
import io.ballerina.compiler.syntax.tree.SelectClauseNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.compiler.syntax.tree.Token;
import io.ballerina.compiler.syntax.tree.TypedBindingPatternNode;
import io.ballerina.compiler.syntax.tree.VariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.WhereClauseNode;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.flowmodelgenerator.core.model.node.VariableBuilder;
import io.ballerina.flowmodelgenerator.core.utils.FileSystemUtils;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.DefaultValueGeneratorUtil;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.Document;
import io.ballerina.projects.ModuleDescriptor;
import io.ballerina.tools.diagnostics.Diagnostic;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.diagramutil.connector.models.connector.Type;
import org.ballerinalang.diagramutil.connector.models.connector.TypeInfo;
import org.ballerinalang.diagramutil.connector.models.connector.types.ArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.types.PrimitiveType;
import org.ballerinalang.diagramutil.connector.models.connector.types.RecordType;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
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
import java.util.stream.Collectors;

/**
 * Generates types of the data mapper model.
 *
 * @since 1.0.0
 */
public class DataMapManager {

    public static final String DOT = "\\.";
    public static final String FROM = "from";
    public static final String WHERE = "where";
    public static final String LIMIT = "limit";
    public static final String ORDER_BY = "order-by";
    private final Document document;
    private final Gson gson = new Gson();

    public DataMapManager(Document document) {
        this.document = document;
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
                                   String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        String targetFieldName;
        if (node.kind() == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode variableDeclarationNode = (VariableDeclarationNode) node;
            targetFieldName = variableDeclarationNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
        } else if (node.kind() == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVariableDeclarationNode = (ModuleVariableDeclarationNode) node;
            targetFieldName = moduleVariableDeclarationNode.typedBindingPattern().bindingPattern()
                    .toSourceCode().trim();
        } else if (node.kind() == SyntaxKind.LET_VAR_DECL) {
            LetVariableDeclarationNode letVariableDeclarationNode = (LetVariableDeclarationNode) node;
            targetFieldName = letVariableDeclarationNode.typedBindingPattern().bindingPattern()
                    .toSourceCode().trim();
        } else {
            throw new IllegalStateException("Unsupported node kind: " + node.kind());
        }

        TargetNode targetNode = getTargetNode(node, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }

        Type type = Type.fromSemanticSymbol(targetNode.typeSymbol());
        String name = targetNode.name();
        MappingPort outputPort = getMappingPort(name, name, type, false);
        ExpressionNode expressionNode = targetNode.expressionNode();

        Query query = null;
        List<MappingPort> inputPorts;
        List<MappingPort> subMappingPorts = null;

        if (expressionNode == null) {
            inputPorts = getInputPorts(semanticModel, this.document, position);
            inputPorts.sort(Comparator.comparing(mt -> mt.id));
            return gson.toJsonTree(new Model(inputPorts, outputPort, new ArrayList<>(), null));
        } else if (expressionNode.kind() == SyntaxKind.QUERY_EXPRESSION) {
            QueryExpressionNode queryExpressionNode = (QueryExpressionNode) targetNode.expressionNode();
            FromClauseNode fromClauseNode = queryExpressionNode.queryPipeline().fromClause();
            LinePosition fromClausePosition = fromClauseNode.lineRange().startLine();
            List<Symbol> symbols = semanticModel.visibleSymbols(document, fromClausePosition);
            symbols = symbols.stream()
                    .filter(symbol -> !symbol.getName().orElse("").equals(targetFieldName))
                    .collect(Collectors.toList());
            inputPorts = getQueryInputPorts(symbols);
            inputPorts.sort(Comparator.comparing(mt -> mt.id));

            List<String> inputs = new ArrayList<>();
            ExpressionNode expression = fromClauseNode.expression();
            inputs.add(expression.toSourceCode().trim());
            Optional<TypeSymbol> typeSymbol = semanticModel.typeOf(expression);
            String itemType = fromClauseNode.typedBindingPattern().typeDescriptor().toSourceCode().trim();
            String fromClauseVar = fromClauseNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
            if (typeSymbol.isPresent() && typeSymbol.get().typeKind() == TypeDescKind.ARRAY) {
                TypeSymbol memberTypeSymbol = ((ArrayTypeSymbol) typeSymbol.get()).memberTypeDescriptor();
                MappingPort mappingPort = getMappingPort(fromClauseVar, fromClauseVar,
                        Type.fromSemanticSymbol(memberTypeSymbol), true);
                if (mappingPort != null) {
                    mappingPort.setIsFocused(true);
                    setFocusIdForExpression(inputPorts, expression.toString().trim(), mappingPort.id);
                    NonTerminalNode parent = expressionNode.parent();
                    SyntaxKind parentKind = parent.kind();
                    while (parentKind != SyntaxKind.LOCAL_VAR_DECL && parentKind != SyntaxKind.MODULE_VAR_DECL)  {
                        if (parentKind == SyntaxKind.QUERY_EXPRESSION) {
                            QueryExpressionNode parentQueryExpr = (QueryExpressionNode) parent;
                            FromClauseNode parentFromClause = parentQueryExpr.queryPipeline().fromClause();
                            ExpressionNode parentExpression = parentFromClause.expression();
                            String parentFromClauseVar = parentFromClause.typedBindingPattern().bindingPattern()
                                    .toSourceCode().trim();
                            Optional<TypeSymbol> expressionTypeSymbol = semanticModel.typeOf(parentExpression);
                            if (expressionTypeSymbol.isPresent() &&
                                    expressionTypeSymbol.get().typeKind() == TypeDescKind.ARRAY) {
                                setIsFocusedForInputPort(inputPorts, parentFromClauseVar);
                                setFocusIdForExpression(inputPorts, parentExpression.toString().trim(),
                                        parentFromClauseVar);
                            }
                        }
                        parent = parent.parent();
                        parentKind = parent.kind();
                    }
                }
                inputPorts.add(mappingPort);
                itemType = memberTypeSymbol.signature().trim();
            }

            Clause fromClause = new Clause(FROM, new Properties(fromClauseVar, itemType,
                    expression.toSourceCode().trim(), null));
            ClauseNode clauseNode = queryExpressionNode.resultClause();
            Clause resultClause;
            if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                resultClause = new Clause("select", new DataMapManager.Properties(null, null,
                        ((SelectClauseNode) clauseNode).expression().toSourceCode().trim(), null));
            } else {
                resultClause = new Clause("collect", new DataMapManager.Properties(null, null,
                        ((CollectClauseNode) clauseNode).expression().toSourceCode().trim(), null));
            }
            query = new Query(name, inputs, fromClause,
                    getQueryIntermediateClause(queryExpressionNode.queryPipeline()), resultClause);
        } else if (expressionNode.kind() == SyntaxKind.LET_EXPRESSION) {
            inputPorts = getInputPorts(semanticModel, this.document, position);
            inputPorts.sort(Comparator.comparing(mt -> mt.id));
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
        } else {
            inputPorts = getInputPorts(semanticModel, this.document, position);
            inputPorts.sort(Comparator.comparing(mt -> mt.id));
        }

        List<Mapping> mappings = new ArrayList<>();
        TypeDescKind typeDescKind = CommonUtils.getRawType(targetNode.typeSymbol()).typeKind();
        if (typeDescKind == TypeDescKind.RECORD) {
            generateRecordVariableDataMapping(expressionNode, mappings, name, semanticModel);
        } else if (typeDescKind == TypeDescKind.ARRAY) {
            generateArrayVariableDataMapping(expressionNode, mappings, name, semanticModel);
        } else {
            genMapping(expressionNode, name, mappings, semanticModel);
        }

        return gson.toJsonTree(new Model(inputPorts, outputPort, subMappingPorts, mappings, query));
    }

    private void setFocusIdForExpression(List<MappingPort> ports, String expression, String focusId) {
        for (MappingPort port : ports) {
            if (expression.equals(port.id)) {
                if (port instanceof DataMapManager.MappingArrayPort arrayPort) {
                    arrayPort.focusedMemberId = focusId;
                }
            }
            if (port instanceof DataMapManager.MappingRecordPort recordPort) {
                setFocusIdForExpression(recordPort.fields, expression, focusId);
            }
            if (port instanceof DataMapManager.MappingArrayPort arrayPort && arrayPort.member != null) {
                setFocusIdForExpression(List.of(arrayPort.member), expression, focusId);
            }
        }
    }

    private void setIsFocusedForInputPort(List<MappingPort> inputPorts, String id) {
        for (MappingPort port : inputPorts) {
            if (port.id.equals(id)) {
                port.setIsFocused(true);
                return;
            }
        }
    }

    private TargetNode getTargetNode(Node parentNode, String targetField, SemanticModel semanticModel) {
        SyntaxKind kind = parentNode.kind();
        Optional<ExpressionNode> optInitializer;
        if (kind == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode varDeclNode = (VariableDeclarationNode) parentNode;
            optInitializer = varDeclNode.initializer();
        } else if (kind == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVarDeclNode = (ModuleVariableDeclarationNode) parentNode;
            optInitializer = moduleVarDeclNode.initializer();
        } else if (kind == SyntaxKind.LET_VAR_DECL) {
            LetVariableDeclarationNode letVariableDeclNode = (LetVariableDeclarationNode) parentNode;
            optInitializer = Optional.of(letVariableDeclNode.expression());
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
        if (targetField == null) {
            return new TargetNode(typeSymbol, variableSymbol.getName().get(), initializer);
        }

        String[] fieldSplits = targetField.split("\\.");
        for (int i = 1; i < fieldSplits.length; i++) {
            String field = fieldSplits[i];
            typeSymbol = CommonUtils.getRawType(typeSymbol);
            TypeDescKind typeDescKind = typeSymbol.typeKind();
            if (typeDescKind == TypeDescKind.ARRAY) {
                typeSymbol = CommonUtils.getRawType(((ArrayTypeSymbol) typeSymbol).memberTypeDescriptor());
            }
            if (field.matches("\\d+")) {
                continue;
            }
            typeDescKind = typeSymbol.typeKind();
            if (typeDescKind == TypeDescKind.RECORD) {
                Map<String, RecordFieldSymbol> fieldSymbols = ((RecordTypeSymbol) typeSymbol).fieldDescriptors();
                RecordFieldSymbol recordFieldSymbol = fieldSymbols.get(field);
                if (recordFieldSymbol == null) {
                    return null;
                }
                typeSymbol = recordFieldSymbol.typeDescriptor();
            } else {
                break;
            }
        }

        ExpressionNode expr = initializer;
        if (expr.kind() == SyntaxKind.QUERY_EXPRESSION) {
            ClauseNode clauseNode = ((QueryExpressionNode) expr).resultClause();
            if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                expr = ((SelectClauseNode) clauseNode).expression();
            } else {
                return null;
            }
        }
        for (int i = 1; i < fieldSplits.length; i++) {
            String field = fieldSplits[i];
            if (expr.kind() == SyntaxKind.QUERY_EXPRESSION) {
                ClauseNode clauseNode = ((QueryExpressionNode) expr).resultClause();
                if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                    expr = ((SelectClauseNode) clauseNode).expression();
                } else {
                    break;
                }
            }
            if (field.matches("\\d+")) {
                int index = Integer.parseInt(field);
                if (expr.kind() != SyntaxKind.LIST_CONSTRUCTOR) {
                    return null;
                }
                ListConstructorExpressionNode listCtrExpressionNode = (ListConstructorExpressionNode) expr;
                SeparatedNodeList<Node> expressions = listCtrExpressionNode.expressions();
                if (index >= expressions.size()) {
                    return null;
                }
                expr = (ExpressionNode) expressions.get(index);
            } else {
                if (expr.kind() != SyntaxKind.MAPPING_CONSTRUCTOR) {
                    return null;
                }
                Map<String, SpecificFieldNode> mappingFieldsMap =
                        convertMappingFieldsToMap((MappingConstructorExpressionNode) expr);
                SpecificFieldNode mappingFieldNode = mappingFieldsMap.get(field);
                if (mappingFieldNode == null) {
                    return null;
                }
                Optional<ExpressionNode> optValueExpr = mappingFieldNode.valueExpr();
                if (optValueExpr.isEmpty()) {
                    return null;
                }
                expr = optValueExpr.get();
            }
        }

        return new TargetNode(typeSymbol, fieldSplits[fieldSplits.length - 1], expr);
    }

    private record TargetNode(TypeSymbol typeSymbol, String name, ExpressionNode expressionNode) {
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
        } else if (exprKind == SyntaxKind.LET_EXPRESSION) {
            generateRecordVariableDataMapping(((LetExpressionNode) expressionNode).expression(), mappings, name,
                    semanticModel);
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

    private List<MappingPort> getQueryInputPorts(List<Symbol> visibleSymbols) {
        List<MappingPort> mappingPorts = new ArrayList<>();
        for (Symbol symbol : visibleSymbols) {
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
            MappingPort memberPort = getMappingPort(isInputPort ? id + ".0" : id, getItemName(id),
                    arrayType.memberType, isInputPort);
            MappingArrayPort arrayPort = new MappingArrayPort(id, name, memberPort == null ? "record" :
                    memberPort.typeName + "[]", type.getTypeName());
            arrayPort.setMember(memberPort);
            return arrayPort;
        } else {
            return null;
        }
    }

    private String getItemName(String id) {
        String[] splits = id.split("\\.");
        return "<" + splits[splits.length - 1] + "Item>";
    }

    public JsonElement getSource(Path filePath, JsonElement cd, JsonElement mp, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        Mapping mapping = gson.fromJson(mp, Mapping.class);
        NonTerminalNode node = getNode(codedata.lineRange());

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

        setImportStatements(mapping.imports(), textEdits);
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

    private void setImportStatements(Map<String, String> importStatements, List<TextEdit> textEdits) {
        if (importStatements == null) {
            return;
        }

        ModulePartNode modulePartNode = document.syntaxTree().rootNode();
        List<ImportDeclarationNode> importDeclNodes = modulePartNode.imports().stream().toList();

        for (String importStatement : importStatements.values()) {
            ModuleDescriptor descriptor = document.module().descriptor();
            if (CommonUtils.getImportStatement(descriptor.org().toString(), descriptor.packageName().value(),
                    descriptor.name().toString()).equals(importStatement)) {
                continue;
            }

            boolean importExists = importDeclNodes.stream().anyMatch(importDeclarationNode -> {
                String importText = importDeclarationNode.toSourceCode().trim();
                return importText.startsWith("import " + importStatement) && importText.endsWith(";");
            });

            if (!importExists) {
                String stmt = new SourceBuilder.TokenBuilder(null)
                        .keyword(SyntaxKind.IMPORT_KEYWORD)
                        .name(importStatement)
                        .endOfStatement()
                        .build(SourceBuilder.SourceKind.IMPORT);
                textEdits.add(new TextEdit(CommonUtils.toRange(0, 0), stmt + System.lineSeparator()));
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
        NonTerminalNode node = getNode(codedata.lineRange());

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
            case FROM: {
                return "from " + properties.type() + " " + properties.name() +
                        " in " + properties.expression();
            }
            case WHERE: {
                return "where " + properties.expression();
            }
            case ORDER_BY: {
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
            case LIMIT: {
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
        NonTerminalNode stNode = getNode(codedata.lineRange());

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        TargetNode targetNode = getTargetNode(stNode, targetField, semanticModel);
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

    public Symbol getMatchedSymbol(String prefix, String type, SemanticModel defaultModuleSM) {
        return defaultModuleSM.moduleSymbols().stream()
                .filter(m -> m.kind() == SymbolKind.MODULE)
                .map(m -> (ModuleSymbol) m)
                .filter(m -> m.getName().isPresent() && m.getName().get().endsWith(prefix))
                .flatMap(m -> m.typeDefinitions().stream()
                        .filter(s -> s.getName().isPresent() && s.getName().get().equals(type))
                        .findFirst().stream())
                .findFirst()
                .orElse(null);
    }

    public Map<String, String> getVisualizableProperties(SemanticModel sm, JsonElement node) {
        Codedata codedata = gson.fromJson(node, Codedata.class);
        String org = codedata.org();
        SemanticModel semanticModel;
        if (org == null || org.isEmpty()) {
            semanticModel = sm;
        } else {
            ModuleInfo moduleInfo = new ModuleInfo(org, codedata.packageName(), codedata.module(), codedata.version());
            Optional<SemanticModel> optSemanticModel = PackageUtil.getSemanticModel(moduleInfo);
            if (optSemanticModel.isEmpty()) {
                throw new IllegalStateException("Semantic model cannot be found for the module: " + moduleInfo);
            }
            semanticModel = optSemanticModel.get();
        }

        String[] typeParts = codedata.symbol().split("\\[", 2);
        String type = typeParts[0];
        boolean isArray = (typeParts.length > 1 ? "[" + typeParts[1] : "").startsWith("[");
        for (Symbol symbol : semanticModel.moduleSymbols()) {
            if (symbol.kind() != SymbolKind.TYPE_DEFINITION) {
                continue;
            }
            if (symbol.getName().isEmpty() || !symbol.getName().get().equals(type)) {
                continue;
            }
            TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) symbol;
            TypeSymbol typeSymbol = typeDefSymbol.typeDescriptor();
            TypeSymbol rawTypeSymbol = CommonUtils.getRawType(typeSymbol);
            TypeDescKind kind = rawTypeSymbol.typeKind();
            if (isEffectiveRecordType(kind, rawTypeSymbol)) {
                if (kind == TypeDescKind.ARRAY || isArray) {
                    return Map.of("expression", "[]");
                } else if (kind == TypeDescKind.RECORD) {
                    return Map.of("expression", "{}");
                }
            }
            throw new IllegalStateException("Unsupported type for visualizable properties: " + kind);
        }

        String[] typeSegments = type.split(":");
        String prefix = typeSegments.length > 1 ? typeSegments[0] : "";
        String typeName = typeSegments.length > 1 ? typeSegments[1] : typeSegments[0];
        Symbol matchedSymbol = getMatchedSymbol(prefix, typeName, semanticModel);
        if (matchedSymbol != null && matchedSymbol.kind() == SymbolKind.TYPE_DEFINITION) {
            TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) matchedSymbol;
            TypeSymbol typeSymbol = typeDefSymbol.typeDescriptor();
            TypeSymbol rawTypeSymbol = CommonUtils.getRawType(typeSymbol);
            TypeDescKind kind = rawTypeSymbol.typeKind();
            if (isEffectiveRecordType(kind, rawTypeSymbol)) {
                if (kind == TypeDescKind.ARRAY || isArray) {
                    return Map.of("expression", "[]");
                } else if (kind == TypeDescKind.RECORD) {
                    return Map.of("expression", "{}");
                }
            }
        }

        return Map.of();
    }

    private boolean isEffectiveRecordType(TypeDescKind kind, TypeSymbol rawTypeSymbol) {
        if (kind == TypeDescKind.ARRAY) {
            TypeDescKind memberKind = ((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor().typeKind();
            return isEffectiveRecordType(memberKind, ((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor());
        }
        return kind == TypeDescKind.RECORD;
    }

    public JsonElement addElement(SemanticModel semanticModel, JsonElement cd, Path filePath, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());

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

    public JsonElement getFieldPosition(SemanticModel semanticModel, JsonElement cd, String targetField,
                                        String fieldId) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());
        if (stNode.kind() != SyntaxKind.LOCAL_VAR_DECL) {
            return null;
        }

        TargetNode expression = getTargetNode(stNode, targetField, semanticModel);
        if (expression == null) {
            return null;
        }
        TypeSymbol typeSymbol = CommonUtils.getRawType(expression.typeSymbol());
        String[] splits = fieldId.split("\\.");
        for (int i = 1; i < splits.length; i++) {
            String split = splits[i];
            TypeDescKind typeDescKind = typeSymbol.typeKind();
            if (split.matches("\\d+")) {
                if (typeDescKind != TypeDescKind.ARRAY) {
                    return null;
                }
                typeSymbol = CommonUtils.getRawType(((ArrayTypeSymbol) typeSymbol).memberTypeDescriptor());
            } else {
                if (typeDescKind != TypeDescKind.RECORD) {
                    return null;
                }
                RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) typeSymbol;
                RecordFieldSymbol recordFieldSymbol = recordTypeSymbol.fieldDescriptors().get(split);
                typeSymbol = CommonUtils.getRawType(recordFieldSymbol.typeDescriptor());
            }
        }

        Property.Builder<DataMapManager> dataMapManagerBuilder = new Property.Builder<>(this);
        Property build = dataMapManagerBuilder
                .type(Property.ValueType.EXPRESSION)
                .typeConstraint(CommonUtils.getTypeSignature(semanticModel, typeSymbol, false))
                .build();
        return gson.toJsonTree(build);
    }

    public JsonElement subMapping(JsonElement cd, String view) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());
        if (stNode.kind() != SyntaxKind.LOCAL_VAR_DECL) {
            return null;
        }

        VariableDeclarationNode varDeclNode = (VariableDeclarationNode) stNode;
        Optional<ExpressionNode> optInitializer = varDeclNode.initializer();
        if (optInitializer.isEmpty()) {
            return null;
        }

        ExpressionNode initializer = optInitializer.get();
        if (initializer.kind() != SyntaxKind.LET_EXPRESSION) {
            return null;
        }

        for (LetVariableDeclarationNode letVarDeclNode : ((LetExpressionNode) initializer).letVarDeclarations()) {
            TypedBindingPatternNode typedBindingPattern = letVarDeclNode.typedBindingPattern();
            if (typedBindingPattern.bindingPattern().toSourceCode().trim().equals(view)) {
                return gson.toJsonTree(new Codedata.Builder<>(null)
                        .lineRange(letVarDeclNode.lineRange())
                        .node(NodeKind.VARIABLE)
                        .build());
            }
        }
        return null;
    }

    public JsonElement nodePosition(JsonElement cd, String name) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        SyntaxTree syntaxTree = document.syntaxTree();
        LineRange lineRange = codedata.lineRange();
        LinePosition startPos = lineRange.startLine();
        int line = startPos.line();
        int offset = startPos.offset();
        NonTerminalNode stNode = CommonUtil.findNode(
                new Range(new Position(line, offset), new Position(line, offset + 1)), syntaxTree);

        while (true) {
            if (stNode == null) {
                return null;
            }
            if (stNode.kind() == SyntaxKind.LOCAL_VAR_DECL) {
                return setPosition(((VariableDeclarationNode) stNode).typedBindingPattern(), stNode.lineRange(), name);
            } else if (stNode.kind() == SyntaxKind.MODULE_VAR_DECL) {
                return setPosition(((ModuleVariableDeclarationNode) stNode).typedBindingPattern(),
                        stNode.lineRange(), name);
            } else if (stNode.kind() == SyntaxKind.LET_VAR_DECL) {
                return setPosition(((LetVariableDeclarationNode) stNode).typedBindingPattern(), stNode.lineRange(),
                        name);
            }
            stNode = stNode.parent();
        }
    }

    private JsonElement setPosition(TypedBindingPatternNode bindingPattern, LineRange range, String name) {
        if (bindingPattern.bindingPattern().toSourceCode().trim().equals(name)) {
            return gson.toJsonTree(new Codedata.Builder<>(null)
                    .lineRange(range)
                    .node(NodeKind.VARIABLE)
                    .build());
        }
        return null;
    }

    private List<Clause> getQueryIntermediateClause(QueryPipelineNode queryPipelineNode) {
        List<Clause> intermediateClauses = new ArrayList<>();
        for (IntermediateClauseNode intermediateClause : queryPipelineNode.intermediateClauses()) {
            SyntaxKind kind = intermediateClause.kind();
            switch (kind) {
                case FROM_CLAUSE -> {
                    FromClauseNode fromClauseNode = (FromClauseNode) intermediateClause;
                    TypedBindingPatternNode typedBindingPattern = fromClauseNode.typedBindingPattern();
                    intermediateClauses.add(new Clause(FROM,
                            new DataMapManager.Properties(typedBindingPattern.bindingPattern().toSourceCode().trim(),
                                    typedBindingPattern.typeDescriptor().toSourceCode().trim(),
                                    fromClauseNode.expression().toSourceCode().trim(), null)));
                }
                case WHERE_CLAUSE -> {
                    WhereClauseNode whereClauseNode = (WhereClauseNode) intermediateClause;
                    ExpressionNode expression = whereClauseNode.expression();
                    intermediateClauses.add(new Clause(WHERE,
                            new Properties(null, null, expression.toSourceCode().trim(), null)));
                }
                case LET_CLAUSE -> {
                    LetClauseNode letClauseNode = (LetClauseNode) intermediateClause;
                    SeparatedNodeList<LetVariableDeclarationNode> letVars = letClauseNode.letVarDeclarations();
                    LetVariableDeclarationNode letVar = letVars.get(0);
                    TypedBindingPatternNode typedBindingPattern = letVar.typedBindingPattern();
                    intermediateClauses.add(new Clause(LIMIT,
                            new Properties(typedBindingPattern.bindingPattern().toSourceCode().trim(),
                                    typedBindingPattern.typeDescriptor().toSourceCode().trim(),
                                    letVar.expression().toSourceCode().trim(), null)));
                }
                case ORDER_BY_CLAUSE -> {
                    OrderByClauseNode order = (OrderByClauseNode) intermediateClause;
                    SeparatedNodeList<OrderKeyNode> orderKeyNodes = order.orderKey();
                    OrderKeyNode orderKey = orderKeyNodes.get(0);
                    String direction = null;
                    Optional<Token> token = orderKey.orderDirection();
                    if (token.isPresent()) {
                        direction = token.get().text();
                    }
                    intermediateClauses.add(new Clause(ORDER_BY,
                            new Properties(null, null, orderKey.expression().toSourceCode().trim(), direction)));
                }
                case LIMIT_CLAUSE -> {
                    LimitClauseNode limitClause = (LimitClauseNode) intermediateClause;
                    intermediateClauses.add(new Clause("limit", new Properties(null, null,
                            limitClause.expression().toSourceCode().trim(), null)));
                }
                default -> {
                }
            }
        }
        return intermediateClauses;
    }

    public JsonElement getSubMapping(WorkspaceManager workspaceManager, Path filePath, JsonElement cd, JsonElement fn,
                                     int index) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        if (node.kind() != SyntaxKind.LOCAL_VAR_DECL) {
            return null;
        }

        VariableDeclarationNode varDeclNode = (VariableDeclarationNode) node;
        Optional<ExpressionNode> optInitializer = varDeclNode.initializer();
        if (optInitializer.isEmpty()) {
            return null;
        }
        ExpressionNode initializer = optInitializer.get();

        FlowNode flowNode = gson.fromJson(fn, FlowNode.class);
        SourceBuilder sourceBuilder = new SourceBuilder(flowNode, workspaceManager, filePath);
        Map<Path, List<TextEdit>> source = (new VariableBuilder()).toSource(sourceBuilder);
        List<TextEdit> tes = source.get(filePath);
        boolean found = false;
        for (TextEdit te : tes) {
            String newText = te.getNewText();
            if (newText.startsWith("import ") || found) {
                continue;
            }

            newText = newText.split(";")[0];
            LinePosition pos;
            if (initializer.kind() == SyntaxKind.LET_EXPRESSION) {
                newText = ", " + newText;
                LetExpressionNode letExpr = (LetExpressionNode) initializer;
                SeparatedNodeList<LetVariableDeclarationNode> letVarDecls = letExpr.letVarDeclarations();
                if (index >= letVarDecls.size()) {
                    pos = letVarDecls.get(letVarDecls.size() - 1).lineRange().endLine();
                } else {
                    pos = letVarDecls.get(index).lineRange().endLine();
                }
            } else {
                newText = "let " + newText.split(";")[0] + " in ";
                pos = initializer.lineRange().startLine();
            }
            te.setNewText(newText);
            te.setRange(CommonUtils.toRange(pos));
            found = true;
        }
        return gson.toJsonTree(source);
    }

    public JsonElement genCustomFunction(WorkspaceManager workspaceManager, SemanticModel semanticModel,
                                         Path filePath, JsonElement cd, JsonElement mp, JsonElement fm,
                                         String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        TargetNode targetNode = getTargetNode(node, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }

        FunctionMetadata functionMetadata = gson.fromJson(fm, FunctionMetadata.class);
        Mapping mapping = gson.fromJson(mp, Mapping.class);

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        ExpressionNode expressionNode = targetNode.expressionNode();
        LineRange fieldExprRange = getFieldExprRange(expressionNode, 1, mapping.output().split("\\."));
        String functionName = genCustomFunctionDef(workspaceManager, filePath, functionMetadata, textEditsMap);
        genCustomFunctionCall(filePath, functionName, fieldExprRange, mapping.output(), textEditsMap);
        return gson.toJsonTree(textEditsMap);
    }

    private LineRange getFieldExprRange(ExpressionNode expr, int idx, String[] names) {
        if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
            String name = names[idx];
            MappingConstructorExpressionNode mappingCtrExpr = (MappingConstructorExpressionNode) expr;
            Map<String, SpecificFieldNode> mappingFields = convertMappingFieldsToMap(mappingCtrExpr);
            SpecificFieldNode mappingFieldNode = mappingFields.get(name);
            if (mappingFieldNode == null) {
                throw new IllegalStateException("Cannot find field: " + name);
            } else {
                return getFieldExprRange(mappingFieldNode.valueExpr().orElseThrow(), idx + 1, names);
            }
        } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
            ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) expr;
            String name = names[idx];
            if (name.matches("\\d+")) {
                int index = Integer.parseInt(name);
                if (index >= listCtrExpr.expressions().size()) {
                    throw new IllegalStateException("Index out of bound");
                } else {
                    return getFieldExprRange((ExpressionNode) listCtrExpr.expressions().get(index), idx + 1, names);
                }
            } else {
                throw new IllegalArgumentException("Invalid field name: " + name);
            }
        } else {
            return expr.lineRange();
        }
    }

    private String genCustomFunctionDef(WorkspaceManager workspaceManager, Path filePath,
                                        FunctionMetadata functionMetadata, Map<Path, List<TextEdit>> textEditsMap) {
        List<Parameter> parameters = functionMetadata.parameters();
        List<String> paramNames = new ArrayList<>();
        for (Parameter parameter : parameters) {
            String paramName = parameter.type();
            if (parameter.isNullable()) {
                paramName = paramName + "?";
            }
            paramName = paramName + " " + parameter.name();
            if (parameter.isOptional()) {
                paramName = paramName + " = " + getDefaultValue(parameter.kind());
            }
            paramNames.add(paramName);
        }

        Path functionsFilePath = workspaceManager.projectRoot(filePath).resolve("functions.bal");
        try {
            workspaceManager.loadProject(filePath);
            Document document = FileSystemUtils.getDocument(workspaceManager, functionsFilePath);
            String returnType = functionMetadata.returnType();
            Range functionRange = CommonUtils.toRange(document.syntaxTree().rootNode().lineRange().endLine());
            String functionName = "function" +
                    (parameters.isEmpty() ? "" : parameters.getFirst().type() + "To" + returnType);
            functionName = functionName + functionRange.getStart().getLine();
            List<TextEdit> textEdits = new ArrayList<>();
            textEdits.add(new TextEdit(functionRange, System.lineSeparator() + "function " +
                    functionName + "(" + String.join(", ", paramNames) + ") returns " + returnType + " {}"));
            textEditsMap.put(functionsFilePath, textEdits);
            return functionName;
        } catch (WorkspaceDocumentException | EventSyncException e) {
            throw new RuntimeException(e);
        }
    }

    private String getDefaultValue(String kind) {
        switch (kind) {
            case "int", "float", "decimal" -> {
                return "0";
            }
            case "boolean" -> {
                return "false";
            }
            case "string" -> {
                return "\"\"";
            }
            case "record" -> {
                return "{}";
            }
            case "array" -> {
                return "[]";
            }
            default -> {
                return "";
            }
        }
    }

    private void genCustomFunctionCall(Path filePath, String functionName, LineRange range, String arg,
                                                Map<Path, List<TextEdit>> textEditsMap) {
        List<TextEdit> textEdits = new ArrayList<>();
        textEdits.add(new TextEdit(CommonUtils.toRange(range), functionName + "(" + arg + ")"));
        textEditsMap.put(filePath, textEdits);
    }

    private NonTerminalNode getNode(LineRange lineRange) {
        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        return modulePartNode.findNode(TextRange.from(start, end - start), true);
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
                           List<MappingElements> elements, Boolean isQueryExpression, Map<String, String> imports) {

        private Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                        List<MappingElements> elements) {
            this(output, inputs, expression, diagnostics, elements, null, null);
        }

        private Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                        List<MappingElements> elements, Boolean isQueryExpression) {
            this(output, inputs, expression, diagnostics, elements, isQueryExpression, null);
        }
    }

    private record FunctionMetadata(List<Parameter> parameters, String returnType) {
    }

    private record Parameter(String name, String type, boolean isOptional, boolean isNullable, String kind) {
    }

    private record Query(String output, List<String> inputs, Clause fromClause,
                         List<Clause> intermediateClauses, Clause resultClause) {

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
        Boolean isFocused;

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

        void setIsFocused(Boolean isFocused) {
            this.isFocused = isFocused;
        }

        Boolean getIsFocused() {
            return this.isFocused;
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
        String focusedMemberId;

        MappingArrayPort(String id, String variableName, String typeName, String kind) {
            super(id, variableName, typeName, kind);
        }

        void setMember(MappingPort member) {
            this.member = member;
        }

        MappingPort getMember() {
            return this.member;
        }

        void setFocusedMemberId(String focusedMemberId) {
            this.focusedMemberId = focusedMemberId;
        }

        String getFocusedMemberId() {
            return this.focusedMemberId;
        }
    }
}
