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
import io.ballerina.compiler.api.symbols.ConstantSymbol;
import io.ballerina.compiler.api.symbols.EnumSymbol;
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
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.BinaryExpressionNode;
import io.ballerina.compiler.syntax.tree.BracedExpressionNode;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.ClauseNode;
import io.ballerina.compiler.syntax.tree.CollectClauseNode;
import io.ballerina.compiler.syntax.tree.ExpressionFunctionBodyNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FieldAccessExpressionNode;
import io.ballerina.compiler.syntax.tree.FromClauseNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.FunctionBodyNode;
import io.ballerina.compiler.syntax.tree.FunctionCallExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.GroupByClauseNode;
import io.ballerina.compiler.syntax.tree.GroupingKeyVarDeclarationNode;
import io.ballerina.compiler.syntax.tree.ImportDeclarationNode;
import io.ballerina.compiler.syntax.tree.IndexedExpressionNode;
import io.ballerina.compiler.syntax.tree.IntermediateClauseNode;
import io.ballerina.compiler.syntax.tree.JoinClauseNode;
import io.ballerina.compiler.syntax.tree.LetClauseNode;
import io.ballerina.compiler.syntax.tree.LetExpressionNode;
import io.ballerina.compiler.syntax.tree.LetVariableDeclarationNode;
import io.ballerina.compiler.syntax.tree.LimitClauseNode;
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
import io.ballerina.compiler.syntax.tree.NodeVisitor;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.OnClauseNode;
import io.ballerina.compiler.syntax.tree.OptionalFieldAccessExpressionNode;
import io.ballerina.compiler.syntax.tree.OrderByClauseNode;
import io.ballerina.compiler.syntax.tree.OrderKeyNode;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.QueryExpressionNode;
import io.ballerina.compiler.syntax.tree.QueryPipelineNode;
import io.ballerina.compiler.syntax.tree.RestArgumentNode;
import io.ballerina.compiler.syntax.tree.SelectClauseNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SpreadMemberNode;
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
import org.ballerinalang.diagramutil.connector.models.connector.ReferenceType;
import org.ballerinalang.diagramutil.connector.models.connector.Type;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefEnumType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefMapType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefRecordType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefStreamType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefTupleType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefUnionType;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.common.utils.NameUtil;
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
import java.util.Objects;
import java.util.Optional;
import java.util.TreeSet;
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
    public static final String LET = "let";
    public static final String ORDER_BY = "order-by";
    public static final String GROUP_BY = "group-by";
    public static final String ITEM = "Item";
    public static final String INT = "int";
    public static final String FLOAT = "float";
    public static final String DECIMAL = "decimal";
    public static final String BOOLEAN = "boolean";
    public static final String STRING = "string";
    public static final String PIPE = "|";
    public static final String ZERO = "0";
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

    public record TypeField(String fieldName, RefType type, boolean optional, String defaultValue,
                            Optional<TypeField> member) {
    }

    public JsonElement getMappings(SemanticModel semanticModel, JsonElement cd, LinePosition position,
                                   String targetField, Document functionDocument, Document dataMappingDocument) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        TargetNode targetNode = getTargetNode(node, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }
        List<Symbol> typeDefSymbols = semanticModel.moduleSymbols().stream()
                .filter(symbol -> symbol.kind() == SymbolKind.TYPE_DEFINITION)
                .toList();
        Map<String, MappingPort> references = new HashMap<>();
        RefType refType;
        try {
            TypeSymbol targetTypeSymbol = targetNode.typeSymbol();
            TypeSymbol rawtargetTypeSymbol = CommonUtils.getRawType(targetNode.typeSymbol());
            if (rawtargetTypeSymbol.typeKind() == TypeDescKind.UNION) {
                targetTypeSymbol =
                        filterErrorOrNil(semanticModel, (UnionTypeSymbol) rawtargetTypeSymbol, new ArrayList<>());
            }
            refType = ReferenceType.fromSemanticSymbol(targetTypeSymbol, typeDefSymbols);
        } catch (UnsupportedOperationException e) {
            return null;
        }

        String name = targetNode.name();
        MappingPort refOutputPort = null;
        if (refType != null) {
            refOutputPort = getRefMappingPort(name, name, refType, new HashMap<>(), references);
        }

        setModuleInfo(targetNode.typeSymbol(), refOutputPort);
        MatchingNode matchingNode = targetNode.matchingNode();
        Query query = null;
        List<MappingPort> inputPorts;
        List<MappingPort> enumPorts = new ArrayList<>();
        List<MappingPort> subMappingPorts = null;
        if (matchingNode == null || matchingNode.expr() == null) {
            inputPorts = getInputPorts(semanticModel, this.document, position, enumPorts, references);
            inputPorts.sort(Comparator.comparing(mt -> mt.name));
            return gson.toJsonTree(new Model(inputPorts, refOutputPort, new ArrayList<>(), null, references));
        }

        if (matchingNode.queryExpr() != null) {
            QueryExpressionNode queryExpressionNode = matchingNode.queryExpr();
            FromClauseNode fromClauseNode = queryExpressionNode.queryPipeline().fromClause();
            LinePosition fromClausePosition = fromClauseNode.lineRange().startLine();
            List<Symbol> symbols = semanticModel.visibleSymbols(document, fromClausePosition);
            symbols = symbols.stream()
                    .filter(symbol -> !symbol.getName().orElse("").equals(getVariableName(node)))
                    .collect(Collectors.toList());
            inputPorts = getQueryInputPorts(symbols, enumPorts, references, typeDefSymbols);
            inputPorts.sort(Comparator.comparing(mt -> mt.name));

            List<String> inputs = new ArrayList<>();
            ExpressionNode expression = fromClauseNode.expression();
            inputs.add(expression.toSourceCode().trim());
            Optional<TypeSymbol> typeSymbol = semanticModel.typeOf(expression);
            String itemType = fromClauseNode.typedBindingPattern().typeDescriptor().toSourceCode().trim();
            String fromClauseVar = fromClauseNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
            if (typeSymbol.isPresent()) {
                TypeSymbol rawTypeSymbol = CommonUtils.getRawType(typeSymbol.get());
                if (rawTypeSymbol.typeKind() == TypeDescKind.ARRAY) {
                    TypeSymbol memberTypeSymbol = ((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor();
                    MappingPort mappingPort = getRefMappingPort(fromClauseVar, fromClauseVar,
                            Objects.requireNonNull(ReferenceType.fromSemanticSymbol(memberTypeSymbol, typeDefSymbols)),
                            new HashMap<>(), references);
                    mappingPort.setFocusExpression(expression.toString().trim());
                    NonTerminalNode parent = matchingNode.queryExpr().parent();
                    SyntaxKind parentKind = parent.kind();
                    while (parentKind != SyntaxKind.LOCAL_VAR_DECL && parentKind != SyntaxKind.MODULE_VAR_DECL
                            && parentKind != SyntaxKind.EXPRESSION_FUNCTION_BODY) {
                        if (parentKind == SyntaxKind.QUERY_EXPRESSION) {
                            QueryExpressionNode parentQueryExpr = (QueryExpressionNode) parent;
                            FromClauseNode parentFromClause = parentQueryExpr.queryPipeline().fromClause();
                            ExpressionNode parentExpression = parentFromClause.expression();
                            String parentFromClauseVar = parentFromClause.typedBindingPattern().bindingPattern()
                                    .toSourceCode().trim();
                            Optional<TypeSymbol> expressionTypeSymbol = semanticModel.typeOf(parentExpression);
                            if (expressionTypeSymbol.isPresent() && CommonUtils.getRawType(
                                    expressionTypeSymbol.get()).typeKind() == TypeDescKind.ARRAY) {
                                setFocusExpressionForInputPort(inputPorts, parentFromClauseVar,
                                        parentExpression.toString().trim());
                            }
                        }
                        parent = parent.parent();
                        parentKind = parent.kind();
                    }
                    inputPorts.add(mappingPort);
                    itemType = memberTypeSymbol.signature().trim();
                }
            }

            List<JoinClauseNode> joinClauses = getJoinClause(queryExpressionNode);
            if (!joinClauses.isEmpty()) {
                for (JoinClauseNode joinClause : joinClauses) {
                    ExpressionNode joinExpression = joinClause.expression();
                    inputs.add(joinExpression.toSourceCode().trim());
                    Optional<TypeSymbol> joinTypeSymbol = semanticModel.typeOf(joinExpression);
                    String joinClauseVar = joinClause.typedBindingPattern().bindingPattern().toSourceCode().trim();
                    if (joinTypeSymbol.isPresent()) {
                        TypeSymbol rawTypeSymbol = CommonUtils.getRawType(joinTypeSymbol.get());
                        if (rawTypeSymbol.typeKind() == TypeDescKind.ARRAY) {
                            TypeSymbol memberTypeSymbol = ((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor();
                            MappingPort mappingPort = getRefMappingPort(joinClauseVar, joinClauseVar,
                                    Objects.requireNonNull(ReferenceType.fromSemanticSymbol(memberTypeSymbol,
                                            typeDefSymbols)), new HashMap<>(), references);
                            mappingPort.setFocusExpression(joinExpression.toString().trim());
                            inputPorts.add(mappingPort);
                        }
                    }
                }
            }

            Clause fromClause = new Clause(FROM, new Properties(fromClauseVar, itemType,
                    expression.toSourceCode().trim(), null, null, null, false));
            ClauseNode clauseNode = queryExpressionNode.resultClause();
            Clause resultClause;
            if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                resultClause = new Clause("select", new DataMapManager.Properties(null, null,
                        ((SelectClauseNode) clauseNode).expression().toSourceCode().trim(), null, null, null, false));
            } else {
                resultClause = new Clause("collect", new DataMapManager.Properties(null, null,
                        ((CollectClauseNode) clauseNode).expression().toSourceCode().trim(), null, null, null, false));
            }
            query = new Query(name, inputs, fromClause,
                    getQueryIntermediateClause(queryExpressionNode.queryPipeline()), resultClause);
        } else if (matchingNode.letExpr() != null) {
            inputPorts = getInputPorts(semanticModel, this.document, position, enumPorts, references);
            inputPorts.sort(Comparator.comparing(mt -> mt.name));
            subMappingPorts = new ArrayList<>();
            for (LetVariableDeclarationNode letVarDeclaration : matchingNode.letExpr().letVarDeclarations()) {
                Optional<Symbol> optSymbol = semanticModel.symbol(letVarDeclaration);
                if (optSymbol.isEmpty()) {
                    continue;
                }
                Symbol symbol = optSymbol.get();
                String letVarName = symbol.getName().orElseThrow();
                subMappingPorts.add(getRefMappingPort(letVarName, letVarName,
                        Objects.requireNonNull(ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols)),
                        new HashMap<>(), references));
            }
        } else {
            inputPorts = getInputPorts(semanticModel, this.document, position, enumPorts, references);
            inputPorts.sort(Comparator.comparing(mt -> mt.name));
        }

        inputPorts = removeParentPort(node, inputPorts);

        List<Mapping> mappings = new ArrayList<>();
        ExpressionNode expr = matchingNode.expr();
        if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
            genMapping((MappingConstructorExpressionNode) expr, mappings, name, semanticModel,
                    functionDocument, dataMappingDocument, enumPorts);
        } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
            genMapping((ListConstructorExpressionNode) expr, mappings, name, semanticModel, functionDocument,
            dataMappingDocument, enumPorts);
        } else {
            genMapping(expr, name, mappings, semanticModel, functionDocument, dataMappingDocument, enumPorts);
        }

        return gson.toJsonTree(new Model(inputPorts, refOutputPort, subMappingPorts, mappings, query, references));
    }

    private List<JoinClauseNode> getJoinClause(QueryExpressionNode query) {
        List<JoinClauseNode> joinClauses = new ArrayList<>();
        for (IntermediateClauseNode intermediateClauseNode : query.queryPipeline().intermediateClauses()) {
            if (intermediateClauseNode.kind() == SyntaxKind.JOIN_CLAUSE) {
                joinClauses.add((JoinClauseNode) intermediateClauseNode);
            }
        }
        return joinClauses;
    }

    private String getVariableName(NonTerminalNode node) {
        if (node.kind() == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode variableDeclarationNode = (VariableDeclarationNode) node;
            return variableDeclarationNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
        } else if (node.kind() == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVariableDeclarationNode = (ModuleVariableDeclarationNode) node;
            return moduleVariableDeclarationNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
        } else if (node.kind() == SyntaxKind.LET_VAR_DECL) {
            LetVariableDeclarationNode letVariableDeclarationNode = (LetVariableDeclarationNode) node;
            return letVariableDeclarationNode.typedBindingPattern().bindingPattern().toSourceCode().trim();
        } else {
            return "";
        }
    }

    private List<MappingPort> removeParentPort(NonTerminalNode node, List<MappingPort> inputPorts) {
        if (node.kind() != SyntaxKind.LET_VAR_DECL) {
            return inputPorts;
        }
        NonTerminalNode parentNode = node.parent();
        while (parentNode != null) {
            if (parentNode.kind() == SyntaxKind.LOCAL_VAR_DECL) {
                break;
            }
            parentNode = parentNode.parent();
        }
        if (parentNode == null) {
            return inputPorts;
        }
        String varName = CommonUtils.getVariableName(((VariableDeclarationNode) parentNode).typedBindingPattern());
        List<MappingPort> newInputPorts = new ArrayList<>();
        for (MappingPort inputPort : inputPorts) {
            if (!inputPort.displayName.equals(varName)) {
                newInputPorts.add(inputPort);
            }
        }
        return newInputPorts;
    }

    private void setFocusExpressionForInputPort(List<MappingPort> inputPorts, String id, String expression) {
        for (MappingPort port : inputPorts) {
            if (port.displayName.equals(id)) {
                port.setFocusExpression(expression);
                return;
            }
        }
    }

    private TargetNode getTargetNode(Node parentNode, String targetField, SemanticModel semanticModel) {
        Optional<Symbol> optSymbol = semanticModel.symbol(parentNode);
        if (optSymbol.isEmpty()) {
            return null;
        }

        String name;
        TypeSymbol typeSymbol;
        Symbol symbol = optSymbol.get();
        if (symbol.kind() == SymbolKind.VARIABLE) {
            VariableSymbol variableSymbol = (VariableSymbol) symbol;
            name = variableSymbol.getName().orElse("");
            typeSymbol = variableSymbol.typeDescriptor();
        } else if (symbol.kind() == SymbolKind.FUNCTION) {
            FunctionSymbol functionSymbol = (FunctionSymbol) symbol;
            name = functionSymbol.getName().orElse("");
            typeSymbol = functionSymbol.typeDescriptor().returnTypeDescriptor().orElseThrow();
        } else {
            return null;
        }

        ExpressionNode initializer = getMappingExpr(parentNode);
        if (initializer == null) {
            return new TargetNode(typeSymbol, name, null);
        }

        if (targetField == null) {
            return new TargetNode(typeSymbol, name, new MatchingNode(initializer, null, null));
        }

        String[] fieldSplits = targetField.split(DOT);
        int idx = 1;
        if (initializer.kind() == SyntaxKind.QUERY_EXPRESSION) {
            if (fieldSplits.length >= 2 && fieldSplits[1].equals(ZERO)) {
                idx = 2;
            }
        }
        for (int i = idx; i < fieldSplits.length; i++) {
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
        if (fieldSplits.length > 1 && expr.kind() == SyntaxKind.LET_EXPRESSION) {
            expr = ((LetExpressionNode) expr).expression();
        }
        MatchingNode matchingNode = getTargetMappingExpr(expr, targetField);
        if (matchingNode == null) {
            return null;
        }
        return new TargetNode(typeSymbol, getLastNonNumericName(fieldSplits), matchingNode);
    }

    private String getLastNonNumericName(String[] names) {
        for (int i = names.length - 1; i >= 0; i--) {
            String name = names[i];
            if (name != null && !name.matches("\\d+")) {
                return name;
            }
        }
        return names[0];
    }

    private MatchingNode getTargetMappingExpr(ExpressionNode expr, String targetField) {
        if (targetField == null) {
            return new MatchingNode(expr, null, null);
        }

        String[] fieldSplits = targetField.split(DOT);
        ExpressionNode targetExpr = expr;
        int idx = 1;

        if (targetExpr.kind() == SyntaxKind.QUERY_EXPRESSION) {
            if (fieldSplits.length == 1) {
                return new MatchingNode(targetExpr, null, null);
            } else {
                QueryExpressionNode queryExpr = (QueryExpressionNode) targetExpr;
                ClauseNode clauseNode = queryExpr.resultClause();
                SyntaxKind clauseKind = clauseNode.kind();
                if (clauseKind == SyntaxKind.SELECT_CLAUSE) {
                    targetExpr = ((SelectClauseNode) clauseNode).expression();
                } else {
                    targetExpr = ((CollectClauseNode) clauseNode).expression();
                }
                idx = 2;
                if (fieldSplits.length == 2 && fieldSplits[1].equals(ZERO)) {
                    return new MatchingNode(targetExpr, queryExpr, null);
                }
            }
        } else if (targetExpr.kind() == SyntaxKind.LET_EXPRESSION) {
            if (fieldSplits.length == 1) {
                return new MatchingNode(((LetExpressionNode) targetExpr).expression(), null, (LetExpressionNode) expr);
            }
        }

        QueryExpressionNode queryExpr = null;
        LetExpressionNode letExpr = null;
        while (true) {
            if (idx == fieldSplits.length) {
                return new MatchingNode(targetExpr, queryExpr, letExpr);
            }
            queryExpr = null;
            letExpr = null;

            String field = fieldSplits[idx];
            if (targetExpr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                Map<String, SpecificFieldNode> mapFields =
                        convertMappingFieldsToMap((MappingConstructorExpressionNode) targetExpr);
                SpecificFieldNode fieldNode = mapFields.get(field);
                if (fieldNode == null) {
                    return null;
                }
                Optional<ExpressionNode> optFieldExpr = fieldNode.valueExpr();
                if (optFieldExpr.isEmpty()) {
                    return null;
                }
                targetExpr = optFieldExpr.get();
            } else if (targetExpr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
                if (!field.matches("\\d+")) {
                    return null;
                }
                int index = Integer.parseInt(field);
                ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) targetExpr;
                SeparatedNodeList<Node> expressions = listCtrExpr.expressions();
                if (index >= expressions.size()) {
                    return null;
                }
                targetExpr = (ExpressionNode) expressions.get(index);
            }

            if (targetExpr.kind() == SyntaxKind.QUERY_EXPRESSION) {
                queryExpr = ((QueryExpressionNode) targetExpr);
                ClauseNode clauseNode = queryExpr.resultClause();
                if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                    targetExpr = ((SelectClauseNode) clauseNode).expression();
                } else {
                    targetExpr = ((CollectClauseNode) clauseNode).expression();
                }
            } else if (targetExpr.kind() == SyntaxKind.LET_EXPRESSION) {
                letExpr = (LetExpressionNode) targetExpr;
                targetExpr = letExpr.expression();
            }
            idx++;
        }
    }

    private record MatchingNode(ExpressionNode expr, QueryExpressionNode queryExpr, LetExpressionNode letExpr) {
    }

    private record TargetNode(TypeSymbol typeSymbol, String name, MatchingNode matchingNode) {
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

    private void genMapping(MappingConstructorExpressionNode mappingCtrExpr, List<Mapping> mappings, String name,
                            SemanticModel semanticModel, Document functionDocument, Document dataMappingDocument,
                            List<MappingPort> enumPorts) {
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
                            name + "." + f.fieldName().toSourceCode().trim(),
                            semanticModel, functionDocument, dataMappingDocument, enumPorts);
                } else if (kind == SyntaxKind.LIST_CONSTRUCTOR) {
                    genMapping((ListConstructorExpressionNode) fieldExpr, mappings, name + "." +
                            f.fieldName().toSourceCode().trim(), semanticModel, functionDocument, dataMappingDocument,
                            enumPorts);
                } else {
                    genMapping(fieldExpr, name + "." + f.fieldName().toSourceCode().trim(), mappings,
                            semanticModel, functionDocument, dataMappingDocument, enumPorts);
                }
            }
        }
    }

    private void genMapping(ListConstructorExpressionNode listCtrExpr, List<Mapping> mappings, String name,
                            SemanticModel semanticModel, Document functionDocument, Document dataMappingDocument,
                            List<MappingPort> enumPorts) {
        SeparatedNodeList<Node> expressions = listCtrExpr.expressions();
        int size = expressions.size();
        List<MappingElements> mappingElements = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            List<Mapping> elements = new ArrayList<>();
            Node expr = expressions.get(i);
            if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                genMapping((MappingConstructorExpressionNode) expr, elements, name + "." + i, semanticModel,
                        functionDocument, dataMappingDocument, enumPorts);
            } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
                genMapping((ListConstructorExpressionNode) expr, elements, name + "." + i, semanticModel,
                        functionDocument, dataMappingDocument, enumPorts);
            } else {
                genMapping(expr, name + "." + i, elements, semanticModel, functionDocument, dataMappingDocument,
                        enumPorts);
            }
            mappingElements.add(new MappingElements(elements));
        }
        Mapping mapping = new Mapping(name, new ArrayList<>(), listCtrExpr.toSourceCode(),
                getDiagnostics(listCtrExpr.lineRange(), semanticModel), mappingElements);
        mappings.add(mapping);
    }

    private void genMapping(Node expr, String name, List<Mapping> elements, SemanticModel semanticModel,
                            Document functionDocument, Document dataMappingDocument, List<MappingPort> enumPorts) {
        List<String> inputs = new ArrayList<>();
        expr.accept(new GenInputsVisitor(inputs, enumPorts));
        LineRange customFunctionRange = getCustomFunctionRange(expr, functionDocument, dataMappingDocument);
        List<String> elementAccessIndex = null;
        if (containsArrayAccess(expr)) {
            elementAccessIndex = extractArrayIndices(expr);
        }
        Mapping mapping = new Mapping(name, inputs, expr.toSourceCode(),
                getDiagnostics(expr.lineRange(), semanticModel), new ArrayList<>(),
                expr.kind() == SyntaxKind.QUERY_EXPRESSION,
                expr.kind() == SyntaxKind.FUNCTION_CALL,
                null,
                customFunctionRange,
                elementAccessIndex);
        elements.add(mapping);
    }

    private boolean containsArrayAccess(Node node) {
        if (node.kind() == SyntaxKind.INDEXED_EXPRESSION) {
            return true;
        }
        if (node instanceof NonTerminalNode nonTerminalNode) {
            for (Node child : nonTerminalNode.children()) {
                if (containsArrayAccess(child)) {
                    return true;
                }
            }
        }
        return false;
    }

    private LineRange getCustomFunctionRange(Node expr, Document functionDocument, Document dataMappingDocument) {
        if ((functionDocument == null && dataMappingDocument == null) || expr.kind() != SyntaxKind.FUNCTION_CALL) {
            return null;
        }
        FunctionCallExpressionNode funcCall = (FunctionCallExpressionNode) expr;
        String funcName = funcCall.functionName().toSourceCode().trim();
        return findFunctionLineRange(funcName, functionDocument, dataMappingDocument);
    }

    private LineRange findFunctionLineRange(String funcName, Document functionDocument, Document dataMappingDocument) {
        LineRange lineRange = null;
        if (functionDocument != null) {
            lineRange = findFunctionLineRangeInDocument(functionDocument, funcName);
            if (lineRange != null) {
                return lineRange;
            }
        }
        if (dataMappingDocument != null) {
            lineRange = findFunctionLineRangeInDocument(dataMappingDocument, funcName);
            return lineRange;
        }
        return null;
    }

    private LineRange findFunctionLineRangeInDocument(Document document, String funcName) {
        if (document == null) {
            return null;
        }

        for (ModuleMemberDeclarationNode member :
                ((ModulePartNode) document.syntaxTree().rootNode()).members()) {
            if (member.kind() != SyntaxKind.FUNCTION_DEFINITION) {
                continue;
            }

            FunctionDefinitionNode functionNode = (FunctionDefinitionNode) member;
            if (functionNode.functionName().text().equals(funcName)) {
                return functionNode.lineRange();
            }
        }
        return null;
    }

    private List<String> getDiagnostics(LineRange lineRange, SemanticModel semanticModel) {
        List<String> diagnosticMsgs = new ArrayList<>();
        for (Diagnostic diagnostic : semanticModel.diagnostics(lineRange)) {
            diagnosticMsgs.add(diagnostic.message());
        }
        return diagnosticMsgs;
    }

    private List<String> extractArrayIndices(Node expr) {
        List<String> indices = new ArrayList<>();
        ArrayIndexExtractorVisitor visitor = new ArrayIndexExtractorVisitor(indices);
        expr.accept(visitor);
        return indices.isEmpty() ? null : indices;
    }

    private List<MappingPort> getInputPorts(SemanticModel semanticModel, Document document, LinePosition position,
                                            List<MappingPort> enumPorts, Map<String, MappingPort> references) {
        List<MappingPort> refMappingPorts =  new ArrayList<>();
        List<Symbol> typeDefSymbols = semanticModel.moduleSymbols().stream()
                .filter(symbol -> symbol.kind() == SymbolKind.TYPE_DEFINITION)
                .toList();
        List<Symbol> symbols = semanticModel.visibleSymbols(document, position);
        for (Symbol symbol : symbols) {
            SymbolKind kind = symbol.kind();
            if (kind == SymbolKind.VARIABLE) {
                Optional<String> optName = symbol.getName();
                if (optName.isEmpty()) {
                    continue;
                }

                VariableSymbol varSymbol = (VariableSymbol) symbol;
                String name = optName.get();
                MappingPort refMappingPort =
                        generateMappingPort(semanticModel, varSymbol.typeDescriptor(), name, name, references);
                if (refMappingPort == null) {
                    continue;
                }
                setModuleInfo(varSymbol.typeDescriptor(), refMappingPort);
                if (varSymbol.qualifiers().contains(Qualifier.CONFIGURABLE)) {
                    refMappingPort.category = "configurable";
                } else {
                    refMappingPort.category =
                            semanticModel.moduleSymbols().contains(varSymbol) ? "module-variable" : "local-variable";
                }
                refMappingPorts.add(refMappingPort);
            } else if (kind == SymbolKind.PARAMETER) {
                Optional<String> optName = symbol.getName();
                if (optName.isEmpty()) {
                    continue;
                }

                TypeSymbol typeSymbol = ((ParameterSymbol) symbol).typeDescriptor();
                String name = optName.get();
                MappingPort refMappingPort =
                        generateMappingPort(semanticModel, typeSymbol, name, name, references);
                if (refMappingPort == null) {
                    continue;
                }
                setModuleInfo(typeSymbol, refMappingPort);
                refMappingPort.category = "parameter";
                refMappingPorts.add(refMappingPort);
            } else if (kind == SymbolKind.CONSTANT) {
                RefType refType;
                try {
                    refType = ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols);
                    if (refType == null) {
                        continue;
                    }
                } catch (UnsupportedOperationException e) {
                    continue;
                }
                MappingPort refMappingPort = getRefMappingPort(refType.name, refType.name, refType, new HashMap<>(),
                        references);
                setModuleInfo(((ConstantSymbol) symbol).typeDescriptor(), refMappingPort);
                refMappingPort.category = "constant";
                refMappingPorts.add(refMappingPort);
            } else if (kind == SymbolKind.ENUM) {
                RefType refType;
                try {
                    refType = ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols);
                    if (refType == null) {
                        continue;
                    }
                } catch (UnsupportedOperationException e) {
                    continue;
                }

                MappingPort refMappingPort = getRefMappingPort(refType.typeName, refType.typeName, refType,
                        new HashMap<>(), references);
                setModuleInfo(((EnumSymbol) symbol).typeDescriptor(), refMappingPort);
                refMappingPort.category = "enum";
                enumPorts.add(refMappingPort);
                refMappingPorts.add(refMappingPort);
            }
        }
        return refMappingPorts;
    }

    private MappingPort generateMappingPort(SemanticModel semanticModel, TypeSymbol typeSymbol, String id, String name,
                                            Map<String, MappingPort> references) {
        TypeSymbol rawType = CommonUtils.getRawType(typeSymbol);
        TypeSymbol ts = typeSymbol;
        List<String> errorOrNil = new ArrayList<>();
        if (rawType.typeKind() == TypeDescKind.UNION) {
            ts = filterErrorOrNil(semanticModel, (UnionTypeSymbol) rawType, errorOrNil);
        }

        List<Symbol> typeDefSymbols = semanticModel.moduleSymbols().stream()
                .filter(symbol -> symbol.kind() == SymbolKind.TYPE_DEFINITION)
                .toList();
        RefType refType;
        try {
            refType = ReferenceType.fromSemanticSymbol(ts, typeDefSymbols);
            if (refType == null) {
                return null;
            }
        } catch (UnsupportedOperationException e) {
            return null;
        }

        String typeName = refType.name;
        if (!errorOrNil.isEmpty()) {
            typeName = typeName + PIPE + String.join(PIPE, errorOrNil);
        }
        return getRefMappingPort(id, name, typeName, refType, new HashMap<>(), references);
    }

    private TypeSymbol filterErrorOrNil(SemanticModel semanticModel, UnionTypeSymbol unionTypeSymbol,
                                        List<String> errorOrNil) {
        List<TypeSymbol> memberTypes = new ArrayList<>();
        for (TypeSymbol member : unionTypeSymbol.memberTypeDescriptors()) {
            TypeSymbol rawMemberType = CommonUtils.getRawType(member);
            if (rawMemberType.typeKind() == TypeDescKind.ERROR || rawMemberType.typeKind() == TypeDescKind.NIL) {
                errorOrNil.add(member.signature());
                continue;
            }
            memberTypes.add(member);
        }
        if (memberTypes.size() == 1) {
            return memberTypes.getFirst();
        }
        return semanticModel.types().builder().UNION_TYPE
                .withMemberTypes(memberTypes.toArray(TypeSymbol[]::new)).build();
    }

    private List<MappingPort> getQueryInputPorts(List<Symbol> visibleSymbols, List<MappingPort> enumPorts,
                                                 Map<String, MappingPort> references, List<Symbol> typeDefSymbols) {
        List<MappingPort> mappingPorts = new ArrayList<>();
        for (Symbol symbol : visibleSymbols) {
            SymbolKind kind = symbol.kind();
            if (kind == SymbolKind.VARIABLE) {
                Optional<String> optName = symbol.getName();
                if (optName.isEmpty()) {
                    continue;
                }
                RefType refType;
                try {
                    refType = ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols);
                    if (refType == null) {
                        continue;
                    }
                } catch (UnsupportedOperationException e) {
                    continue;
                }
                MappingPort refMappingPort = getRefMappingPort(optName.get(), optName.get(), refType, new HashMap<>(),
                        references);
                VariableSymbol varSymbol = (VariableSymbol) symbol;
                setModuleInfo(varSymbol.typeDescriptor(), refMappingPort);
                if (varSymbol.qualifiers().contains(Qualifier.CONFIGURABLE)) {
                    refMappingPort.category = "configurable";
                } else {
                    refMappingPort.category = "variable";
                }
                mappingPorts.add(refMappingPort);
            } else if (kind == SymbolKind.PARAMETER) {
                Optional<String> optName = symbol.getName();
                if (optName.isEmpty()) {
                    continue;
                }

                RefType refType;
                try {
                    refType = ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols);
                    if (refType == null) {
                        continue;
                    }
                } catch (UnsupportedOperationException e) {
                    continue;
                }

                MappingPort refMappingPort = getRefMappingPort(optName.get(), optName.get(), refType, new HashMap<>(),
                        references);
                setModuleInfo(((ParameterSymbol) symbol).typeDescriptor(), refMappingPort);
                refMappingPort.category = "parameter";
                mappingPorts.add(refMappingPort);
            } else if (kind == SymbolKind.CONSTANT) {
                RefType refType;
                try {
                    refType = ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols);
                    if (refType == null) {
                        continue;
                    }
                } catch (UnsupportedOperationException e) {
                    continue;
                }
                MappingPort refMappingPort = getRefMappingPort(refType.name, refType.name, refType, new HashMap<>(),
                        references);
                setModuleInfo(((ConstantSymbol) symbol).typeDescriptor(), refMappingPort);
                refMappingPort.category = "constant";
                mappingPorts.add(refMappingPort);
            } else if (kind == SymbolKind.ENUM) {
                RefType refType;
                try {
                    refType = ReferenceType.fromSemanticSymbol(symbol, typeDefSymbols);
                    if (refType == null) {
                        continue;
                    }
                } catch (UnsupportedOperationException e) {
                    continue;
                }

                MappingPort refMappingPort = getRefMappingPort(refType.typeName, refType.typeName, refType,
                        new HashMap<>(), references);
                setModuleInfo(((EnumSymbol) symbol).typeDescriptor(), refMappingPort);
                refMappingPort.category = "enum";
                enumPorts.add(refMappingPort);
                mappingPorts.add(refMappingPort);
            }
        }
        return mappingPorts;
    }

    private MappingPort getRefMappingPort(String id, String name, RefType type, Map<String, Type> visitedTypes,
                                          Map<String, MappingPort> references) {
        return getRefMappingPort(id, name, type.name, type, visitedTypes, references);
    }

    private MappingPort getRefMappingPort(String id, String name, String typeName, RefType type,
                                          Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        if (type.typeName == null) {
            return createSimpleMappingPort(id, name, typeName, type);
        }

        return switch (type.typeName) {
            case "record" -> handleRecordType(id, name, typeName, type, visitedTypes, references);
            case "array" -> handleArrayType(id, name, type, visitedTypes, references);
            case "enum" -> handleEnumType(id, name, typeName, type, visitedTypes, references);
            case "union" -> handleUnionType(id, name, typeName, type, visitedTypes, references);
            case "tuple" -> handleTupleType(id, name, typeName, type, visitedTypes, references);
            case "map" -> handleMapType(id, name, type, visitedTypes, references);
            case "stream" -> handleStreamType(id, name, type, visitedTypes, references);
            default -> {
                if (type.hashCode != null && !type.hashCode.isEmpty()) {
                    throw new IllegalStateException("Unexpected type with hashCode: " + type.typeName);
                }
                yield createSimpleMappingPort(id, name, type.typeName, type);
            }
        };
    }

    private MappingPort handleRecordType(String id, String name, String typeName, RefType type,
                                         Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        if (!(type instanceof RefRecordType recordType)) {
            return createRecordPort(id, name, typeName, type);
        }

        String recordTypeName = resolveTypeName(typeName != null ? typeName : "record", type, typeName != null);
        MappingRecordPort recordPort = new MappingRecordPort(id, name, recordTypeName, "record", recordType.key);
        recordPort.typeInfo = (typeName != null && isExternalType(type)) ? createTypeInfo(type) : null;

        processRecordFields(recordPort, recordType, visitedTypes, references);
        addToReferences(references, recordType.key, recordPort);
        processDependentTypes(id, recordType.dependentTypes, visitedTypes, references);

        return new MappingRecordPort(recordPort);
    }

    private MappingPort handleArrayType(String id, String name, RefType type,
                                        Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        if (!(type instanceof RefArrayType arrayType)) {
            return new MappingArrayPort(id, name, "array[]", "array", type.key);
        }

        String itemName = getItemName(name);
        MappingPort memberPort = getRefMappingPort(id, itemName, arrayType.elementType, visitedTypes, references);
        if (memberPort.displayName == null) {
            memberPort.displayName = itemName;
        }

        String arrayTypeName = buildArrayTypeName(memberPort, type);
        MappingArrayPort arrayPort = new MappingArrayPort(id, name, arrayTypeName, "array", type.hashCode);
        arrayPort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;
        arrayPort.setMember(memberPort);

        processDependentTypes(id, arrayType.dependentTypes, visitedTypes, references);
        return arrayPort;
    }

    private MappingPort handleMapType(String id, String name, RefType type,
                                       Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        if (!(type instanceof RefMapType mapType)) {
            return new MappingMapPort(id, name, "map", "map", type.key);
        }

        String valueName = getItemName(name);
        MappingPort valuePort = getRefMappingPort(id, valueName, mapType.valueType, visitedTypes, references);
        if (valuePort.displayName == null) {
            valuePort.displayName = valueName;
        }

        String mapTypeName = buildMapTypeName(valuePort, type);
        MappingMapPort mapPort = new MappingMapPort(id, name, mapTypeName, "map", type.hashCode);
        mapPort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;
        mapPort.setValue(valuePort);
        processDependentTypes(id, mapType.dependentTypes, visitedTypes, references);

        return mapPort;
    }

    private MappingPort handleEnumType(String id, String name, String typeName, RefType type,
                                       Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        String enumTypeName = resolveTypeName(typeName, type, true);
        TypeInfo typeInfo = isExternalType(type) ? createTypeInfo(type) : null;

        if (!(type instanceof RefEnumType enumType)) {
            MappingEnumPort enumPort = new MappingEnumPort(id, name, enumTypeName, "enum", type.key);
            enumPort.typeInfo = typeInfo;
            return enumPort;
        }

        MappingEnumPort enumPort = new MappingEnumPort(id, enumTypeName, enumTypeName, "enum", type.key);
        enumPort.typeInfo = typeInfo;

        for (RefType member : enumType.members) {
            MappingPort memberPort = getRefMappingPort(enumPort.typeName + "." + member.name, member.name,
                    member, visitedTypes, references);
            enumPort.members.add(memberPort);

        }

        processDependentTypes(id, enumType.dependentTypes, visitedTypes, references);
        return enumPort;
    }

    private MappingPort handleUnionType(String id, String name, String typeName, RefType type,
                                        Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        MappingUnionPort unionPort = new MappingUnionPort(id, name, typeName, "union", type.key);
        unionPort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;

        if (!(type instanceof RefUnionType unionType)) {
            return unionPort;
        }

        List<String> memberNames = new ArrayList<>();
        for (RefType member : unionType.memberTypes) {
            MappingPort memberPort = getRefMappingPort(id, name, member, visitedTypes, references);
            unionPort.members.add(memberPort);
            memberNames.add(memberPort.typeName);
        }
        unionPort.typeName = String.join(PIPE, memberNames);

        processDependentTypes(id, unionType.dependentTypes, visitedTypes, references);
        return unionPort;
    }

    private MappingPort handleTupleType(String id, String name, String typeName, RefType type,
                                        Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        MappingTuplePort tuplePort = new MappingTuplePort(id, name, typeName, "tuple", type.key);
        tuplePort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;

        for (RefType member : ((RefTupleType) type).memberTypes) {
            MappingPort memberPort = getRefMappingPort(id, name, member, visitedTypes, references);
            tuplePort.members.add(memberPort);
        }

        processDependentTypes(id, type.dependentTypes, visitedTypes, references);
        return tuplePort;
    }

    private MappingPort createSimpleMappingPort(String id, String name, String typeName, RefType type) {
        String portTypeName = resolveTypeName(typeName, type, true);
        MappingPort mappingPort = new MappingPort(id, name, portTypeName, portTypeName);
        mappingPort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;
        return mappingPort;
    }

    private MappingRecordPort createRecordPort(String id, String name, String typeName, RefType type) {
        String recordTypeName = resolveTypeName(typeName, type, true);
        MappingRecordPort recordPort = new MappingRecordPort(id, name, recordTypeName, "record", type.key);
        recordPort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;
        return recordPort;
    }

    private String resolveTypeName(String typeName, RefType type, boolean includePrefix) {
        if (!isExternalType(type) || !includePrefix) {
            return typeName;
        }
        return type.moduleInfo.modulePrefix + ":" + typeName;
    }

    private TypeInfo createTypeInfo(RefType type) {
        return new TypeInfo(type.moduleInfo.orgName, type.moduleInfo.moduleName);
    }

    private String buildArrayTypeName(MappingPort memberPort, RefType type) {
        if (memberPort == null) {
            return "array[]";
        }

        String memberTypeName = memberPort.typeName;
        boolean isUnionMember = memberPort.kind.endsWith("union");
        if (isUnionMember) {
            memberTypeName = "(" + memberTypeName + ")";
        }

        String arrayTypeName = memberTypeName + "[]";
        if (isExternalType(type) && !isUnionMember && memberPort.typeInfo == null) {
            arrayTypeName = type.moduleInfo.modulePrefix + ":" + arrayTypeName;
        }
        return arrayTypeName;
    }

    private String buildMapTypeName(MappingPort valuePort, RefType type) {
        if (valuePort == null) {
            return "map<any>";
        }

        String valueTypeName = valuePort.typeName;
        boolean isUnionValue = valuePort.kind.endsWith("union");
        if (isUnionValue) {
            valueTypeName = "(" + valueTypeName + ")";
        }

        String mapTypeName = "map<" + valueTypeName + ">";
        if (isExternalType(type) && !isUnionValue && valuePort.typeInfo == null) {
            mapTypeName = type.moduleInfo.modulePrefix + ":" + mapTypeName;
        }
        return mapTypeName;
    }

    private MappingPort handleStreamType(String id, String name, RefType type,
                                          Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        if (!(type instanceof RefStreamType streamType)) {
            return new MappingStreamPort(id, name, "stream", "stream", type.key);
        }

        String valueName = getItemName(name);
        MappingPort valuePort = getRefMappingPort(id, valueName, streamType.valueType, visitedTypes, references);
        if (valuePort.displayName == null) {
            valuePort.displayName = valueName;
        }

        MappingPort completionPort = null;
        if (streamType.completionType != null) {
            String completionName = name + "Completion";
            completionPort = getRefMappingPort(id, completionName, streamType.completionType, visitedTypes, references);
            if (completionPort.displayName == null) {
                completionPort.displayName = completionName;
            }
        }

        String streamTypeName = buildStreamTypeName(valuePort, completionPort, type);
        MappingStreamPort streamPort = new MappingStreamPort(id, name, streamTypeName, "stream", type.hashCode);
        streamPort.typeInfo = isExternalType(type) ? createTypeInfo(type) : null;
        streamPort.setValue(valuePort);
        if (completionPort != null) {
            streamPort.setCompletion(completionPort);
        }
        processDependentTypes(id, streamType.dependentTypes, visitedTypes, references);

        return streamPort;
    }

    private String buildStreamTypeName(MappingPort valuePort, MappingPort completionPort, RefType type) {
        if (valuePort == null) {
            return "stream<any>";
        }

        String valueTypeName = valuePort.typeName;
        boolean isUnionValue = valuePort.kind.endsWith("union");
        if (isUnionValue) {
            valueTypeName = "(" + valueTypeName + ")";
        }

        String streamTypeName;
        if (completionPort != null && !"()".equals(completionPort.typeName) &&
                !"nil".equals(completionPort.typeName)) {
            String completionTypeName = completionPort.typeName;
            boolean isUnionCompletion = completionPort.kind.endsWith("union");
            if (isUnionCompletion) {
                completionTypeName = "(" + completionTypeName + ")";
            }
            streamTypeName = "stream<" + valueTypeName + ", " + completionTypeName + ">";
        } else {
            streamTypeName = "stream<" + valueTypeName + ">";
        }

        if (isExternalType(type) && !isUnionValue && valuePort.typeInfo == null) {
            streamTypeName = type.moduleInfo.modulePrefix + ":" + streamTypeName;
        }
        return streamTypeName;
    }

    private void processRecordFields(MappingRecordPort recordPort, RefRecordType recordType,
                                     Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        for (ReferenceType.Field field : recordType.fields) {
            MappingPort fieldPort = getRefMappingPort(field.fieldName(), field.fieldName(),
                    field.type(), visitedTypes, references);
            fieldPort.setOptional(field.optional());
            recordPort.fields.add(fieldPort);
        }
    }

    private void addToReferences(Map<String, MappingPort> references, String key, MappingRecordPort recordPort) {
        if (!references.containsKey(key)) {
            references.put(key, new MappingRecordPort(recordPort, false));
        }
    }

    private void processDependentTypes(String id, Map<String, RefType> dependentTypes,
                                       Map<String, Type> visitedTypes, Map<String, MappingPort> references) {
        if (dependentTypes == null) {
            return;
        }

        for (Map.Entry<String, RefType> entry : dependentTypes.entrySet()) {
            getRefMappingPort(id + "." + entry.getKey(), entry.getKey(), entry.getValue(), visitedTypes, references);
        }
    }

    private String getItemName(String name) {
        if (name.startsWith("<") && name.endsWith(">")) {
            name = name.trim().substring(1, name.length() - 1);
        }
        return "<" + name + "Item>";
    }

    private void setModuleInfo(TypeSymbol symbol, MappingPort mappingPort) {
        if (!CommonUtils.isWithinPackage(symbol, ModuleInfo.from(this.document.module().descriptor()))) {
            Optional<ModuleSymbol> module = symbol.getModule();
            module.ifPresent(moduleSymbol -> mappingPort.moduleInfo = ModuleInfo.from(moduleSymbol.id()));
        }
    }

    private boolean isExternalType(RefType refType) {
        if (refType.moduleInfo == null) {
            return false;
        }
        ModuleInfo currentModuleInfo = ModuleInfo.from(this.document.module().descriptor());
        return !refType.moduleInfo.orgName.equals(currentModuleInfo.org()) ||
               !refType.moduleInfo.packageName.equals(currentModuleInfo.packageName());
    }

    public JsonElement getSource(Path filePath, JsonElement cd, JsonElement mp, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        Mapping mapping = gson.fromJson(mp, Mapping.class);
        NonTerminalNode node = getNode(codedata.lineRange());

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        ExpressionNode expr = null;
        if (node.kind() == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode varDecl = (VariableDeclarationNode) node;
            expr = varDecl.initializer().orElseThrow();
        } else if (node.kind() == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVarDecl = (ModuleVariableDeclarationNode) node;
            expr = moduleVarDecl.initializer().orElseThrow();
        } else if (node.kind() == SyntaxKind.LET_VAR_DECL) {
            LetVariableDeclarationNode varDecl = (LetVariableDeclarationNode) node;
            expr = varDecl.expression();
        } else if (node.kind() == SyntaxKind.FUNCTION_DEFINITION) {
            FunctionDefinitionNode funcDefNode = (FunctionDefinitionNode) node;
            FunctionBodyNode funcBodyNode = funcDefNode.functionBody();
            if (funcBodyNode.kind() == SyntaxKind.EXPRESSION_FUNCTION_BODY) {
                ExpressionFunctionBodyNode exprFuncBodyNode = (ExpressionFunctionBodyNode) funcBodyNode;
                expr = exprFuncBodyNode.expression();
            }
        }

        if (expr != null) {
            if (expr.kind() == SyntaxKind.LET_EXPRESSION) {
                expr = ((LetExpressionNode) expr).expression();
            }
            String output = mapping.output();
            String[] splits = output.split(DOT);
            StringBuilder sb = new StringBuilder();
            MatchingNode targetMappingExpr = getTargetMappingExpr(expr, targetField);
            if (targetMappingExpr != null) {
                expr = targetMappingExpr.expr();
            }
            genSource(expr, splits, 1, sb, mapping.expression(), null, textEdits);
        }

        setImportStatements(mapping.imports(), textEdits);
        return gson.toJsonTree(textEditsMap);
    }

    public JsonElement deleteMapping(SemanticModel semanticModel, Path filePath, JsonElement codeData,
                                     JsonElement mappingId, String targetField) {
        Codedata codedata = gson.fromJson(codeData, Codedata.class);
        Mapping mapping = gson.fromJson(mappingId, Mapping.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        TargetNode targetNode = getTargetNode(node, targetField, semanticModel);
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);
        String output = mapping.output();
        String[] splits = output.split(DOT);
        if (targetNode != null && targetNode.matchingNode != null && targetNode.matchingNode.expr() != null) {
            ExpressionNode expr = targetNode.matchingNode.expr();
            genDeleteMappingSource(semanticModel, expr, splits, 1, textEdits, targetNode.typeSymbol);
        }
        return gson.toJsonTree(textEditsMap);
    }

    private ExpressionNode getMappingExpr(Node node) {
        SyntaxKind kind = node.kind();
        if (kind == SyntaxKind.LOCAL_VAR_DECL) {
            VariableDeclarationNode varDecl = (VariableDeclarationNode) node;
            return varDecl.initializer().orElse(null);
        } else if (kind == SyntaxKind.MODULE_VAR_DECL) {
            ModuleVariableDeclarationNode moduleVarDecl = (ModuleVariableDeclarationNode) node;
            return moduleVarDecl.initializer().orElse(null);
        } else if (kind == SyntaxKind.LET_VAR_DECL) {
            LetVariableDeclarationNode letVarDecl = (LetVariableDeclarationNode) node;
            return letVarDecl.expression();
        } else if (kind == SyntaxKind.FUNCTION_DEFINITION) {
            FunctionDefinitionNode funcDefNode = (FunctionDefinitionNode) node;
            FunctionBodyNode funcBodyNode = funcDefNode.functionBody();
            if (funcBodyNode.kind() == SyntaxKind.EXPRESSION_FUNCTION_BODY) {
                ExpressionFunctionBodyNode exprFuncBodyNode = (ExpressionFunctionBodyNode) funcBodyNode;
                return exprFuncBodyNode.expression();
            }
        }
        return null;
    }


    private void genSource(ExpressionNode expr, String[] names, int idx, StringBuilder stringBuilder,
                           String mappingExpr, LinePosition position, List<TextEdit> textEdits) {
        if (idx == names.length) {
            textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), mappingExpr));
        } else if (expr == null) {
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
        } else if (expr.kind() == SyntaxKind.QUERY_EXPRESSION) {
            ClauseNode clauseNode = ((QueryExpressionNode) expr).resultClause();
            if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                expr = ((SelectClauseNode) clauseNode).expression();
            } else {
                expr = ((CollectClauseNode) clauseNode).expression();
            }
            genSource(expr, names, idx, stringBuilder, mappingExpr, position, textEdits);
        }
    }

    private void genDeleteMappingSource(SemanticModel semanticModel, ExpressionNode expr, String[] names, int idx,
                                        List<TextEdit> textEdits, TypeSymbol targetSymbol) {
        if (idx == names.length) {
            NonTerminalNode currentNode = expr;
            NonTerminalNode highestEmptyField = null;

            while (true) {
                NonTerminalNode parentNode = currentNode.parent();
                if (parentNode == null) {
                    break;
                }
                if (parentNode.kind() == SyntaxKind.SPECIFIC_FIELD) {
                    SpecificFieldNode specificField = (SpecificFieldNode) parentNode;
                    NonTerminalNode grandParent = parentNode.parent();

                    if (grandParent != null && grandParent.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
                        MappingConstructorExpressionNode mappingCtr = (MappingConstructorExpressionNode)
                                grandParent;

                        if (mappingCtr.fields().size() == 1) {
                            highestEmptyField = specificField;
                            currentNode = grandParent;
                            continue;
                        }
                    }
                }
                break;
            }

            if (highestEmptyField != null) {
                textEdits.add(new TextEdit(CommonUtils.toRange(highestEmptyField.lineRange()), ""));
            } else {
                NonTerminalNode parent = expr.parent();
                SyntaxKind parentKind = parent.kind();
                if (parentKind == SyntaxKind.SPECIFIC_FIELD) {
                    SpecificFieldNode specificField = (SpecificFieldNode) parent;
                    MappingConstructorExpressionNode mappingCtr = (MappingConstructorExpressionNode)
                            specificField.parent();
                    SeparatedNodeList<MappingFieldNode> fields = mappingCtr.fields();
                    int fieldCount = fields.size();

                    if (fieldCount > 1) {
                        int fieldIndex = -1;
                        for (int i = 0; i < fieldCount; i++) {
                            if (fields.get(i) == specificField) {
                                fieldIndex = i;
                                break;
                            }
                        }
                        if (fieldIndex >= 0) {
                            TextRange deleteRange;
                            if (fieldIndex == fieldCount - 1) {
                                TextRange fieldRange = specificField.textRange();
                                Node separator = fields.getSeparator(fieldIndex - 1);
                                if (separator != null) {
                                    deleteRange = TextRange.from(
                                            separator.textRange().startOffset(),
                                            fieldRange.endOffset() - separator.textRange().startOffset()
                                    );
                                } else {
                                    deleteRange = fieldRange;
                                }
                            } else {
                                TextRange fieldRange = specificField.textRange();
                                Node separator = fields.getSeparator(fieldIndex);
                                if (separator != null) {
                                    deleteRange = TextRange.from(
                                            fieldRange.startOffset(),
                                            fields.get(fieldIndex + 1).
                                                    textRange().startOffset() - fieldRange.startOffset()
                                    );
                                } else {
                                    deleteRange = fieldRange;
                                }
                            }

                            String fileName = document.name();
                            LinePosition startPos = document.syntaxTree().
                                    textDocument().linePositionFrom(deleteRange.startOffset());
                            LinePosition endPos = document.syntaxTree().
                                    textDocument().linePositionFrom(deleteRange.endOffset());

                            LineRange lineRangeToDelete = LineRange.from(fileName, startPos, endPos);
                            textEdits.add(new TextEdit(CommonUtils.toRange(lineRangeToDelete), ""));
                        } else {
                            textEdits.add(new TextEdit(CommonUtils.toRange(specificField.lineRange()), ""));
                        }
                    } else {
                        textEdits.add(new TextEdit(CommonUtils.toRange(specificField.lineRange()), ""));
                    }
                } else if (parentKind == SyntaxKind.LIST_CONSTRUCTOR) {
                    ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) parent;
                    SeparatedNodeList<Node> expressions = listCtrExpr.expressions();
                    int memberIdx = 0;
                    for (int i = 0; i < expressions.size(); i++) {
                        if (expressions.get(i).equals(expr)) {
                            memberIdx = i;
                            break;
                        }
                    }

                    if (expressions.size() == 1) {
                        textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), ""));
                    } else {
                        if (memberIdx + 1 == expressions.size()) {
                            LinePosition startPos = expressions.get(memberIdx - 1).lineRange().endLine();
                            LinePosition endPos = expr.lineRange().endLine();
                            textEdits.add(new TextEdit(CommonUtils.toRange(startPos, endPos), ""));
                        } else if (memberIdx == 0) {
                            LinePosition startPos = expr.lineRange().startLine();
                            LinePosition endPos = expressions.get(1).lineRange().startLine();
                            textEdits.add(new TextEdit(CommonUtils.toRange(startPos, endPos), ""));
                        } else {
                            LinePosition startPos = expressions.get(memberIdx - 1).lineRange().endLine();
                            LinePosition endPos = expr.lineRange().endLine();
                            textEdits.add(new TextEdit(CommonUtils.toRange(startPos, endPos), ""));
                        }
                    }
                } else if (parentKind == SyntaxKind.LOCAL_VAR_DECL ||
                        parentKind == SyntaxKind.LET_VAR_DECL) {
                    Optional<Symbol> optSymbol = semanticModel.symbol(parent);
                    if (optSymbol.isPresent()) {
                        Symbol symbol = optSymbol.get();
                        if (symbol.kind() == SymbolKind.VARIABLE) {
                            VariableSymbol varSymbol = (VariableSymbol) symbol;
                            String defaultVal = getDefaultValue(
                                    CommonUtil.getRawType(varSymbol.typeDescriptor()).typeKind().getName());
                            textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), defaultVal));
                        }
                    }
                } else if (parentKind == SyntaxKind.EXPRESSION_FUNCTION_BODY) {
                    Optional<Symbol> optSymbol = semanticModel.symbol(parent.parent());
                    if (optSymbol.isEmpty()) {
                        return;
                    }
                    Symbol symbol = optSymbol.get();
                    if (symbol.kind() == SymbolKind.FUNCTION) {
                        FunctionSymbol functionSymbol = (FunctionSymbol) symbol;
                        Optional<TypeSymbol> returnType = functionSymbol.typeDescriptor().returnTypeDescriptor();
                        if (returnType.isPresent()) {
                            TypeSymbol returnTypeSymbol = returnType.get();
                            String defaultVal = getDefaultValue(
                                    CommonUtil.getRawType(returnTypeSymbol).typeKind().getName());
                            textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), defaultVal));
                        }
                    }
                } else if (parent.kind() == SyntaxKind.SELECT_CLAUSE) {
                    if (targetSymbol != null) {
                        if (targetSymbol instanceof ArrayTypeSymbol arrayTypeSymbol) {
                            String defaultVal = getDefaultValue(
                                    CommonUtil.getRawType(arrayTypeSymbol.memberTypeDescriptor()).typeKind().getName());
                            textEdits.add(new TextEdit(CommonUtils.toRange(expr.lineRange()), defaultVal));
                        }
                    }
                }
            }
        } else if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
            MappingConstructorExpressionNode mappingCtrExpr = (MappingConstructorExpressionNode) expr;
            String name = names[idx];
            Map<String, SpecificFieldNode> mappingFields = convertMappingFieldsToMap(mappingCtrExpr);
            SpecificFieldNode mappingFieldNode = mappingFields.get(name);
            if (mappingFieldNode != null) {
                genDeleteMappingSource(semanticModel, mappingFieldNode.valueExpr().orElseThrow(), names, idx + 1,
                        textEdits, targetSymbol);
            }
        } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
            ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) expr;
            String name = names[idx];
            if (name.matches("\\d+")) {
                int index = Integer.parseInt(name);
                if (index < listCtrExpr.expressions().size()) {
                    genDeleteMappingSource(semanticModel, (ExpressionNode) listCtrExpr.expressions().get(index),
                            names, idx + 1, textEdits, targetSymbol);
                }
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
                textEdits.add(new TextEdit(CommonUtils.toRange(0, 0),
                        stmt + System.lineSeparator()));
            }
        }
    }

    public JsonElement addClause(Path filePath, JsonElement cd, JsonElement cl, int index, String targetField) {
        Clause clause = gson.fromJson(cl, Clause.class);
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        ExpressionNode expr = getMappingExpr(node);
        if (expr == null) {
            return gson.toJsonTree(textEditsMap);
        }
        MatchingNode matchingNode = getTargetMappingExpr(expr, targetField);
        if (matchingNode == null) {
            return gson.toJsonTree(textEditsMap);
        }
        QueryExpressionNode queryExpr = matchingNode.queryExpr();
        if (queryExpr == null) {
            return gson.toJsonTree(textEditsMap);
        }
        String clauseStr = genClause(clause);
        NodeList<IntermediateClauseNode> intermediateClauseNodes = queryExpr.queryPipeline().intermediateClauses();
        if (codedata.isNew() != null && codedata.isNew()) {
            clauseStr = System.lineSeparator() + clauseStr;
            if (index == -1) {
                textEdits.add(new TextEdit(CommonUtils.toRange(
                        queryExpr.queryPipeline().fromClause().lineRange().endLine()), clauseStr));
            } else {
                if (index >= intermediateClauseNodes.size()) {
                    throw new IllegalArgumentException("Index out of bounds: " + index);
                }
                textEdits.add(new TextEdit(CommonUtils.toRange(
                        intermediateClauseNodes.get(index).lineRange().endLine()), clauseStr));
            }
        } else {
            textEdits.add(new TextEdit(CommonUtils.toRange(
                    intermediateClauseNodes.get(index).lineRange()), clauseStr));
        }
        return gson.toJsonTree(textEditsMap);
    }

    public JsonElement deleteClause(Path filePath, JsonElement cd, int index, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        ExpressionNode expr = getMappingExpr(node);
        if (expr == null) {
            return gson.toJsonTree(textEditsMap);
        }
        MatchingNode matchingNode = getTargetMappingExpr(expr, targetField);
        if (matchingNode == null) {
            return gson.toJsonTree(textEditsMap);
        }
        QueryExpressionNode queryExpr = matchingNode.queryExpr();
        if (queryExpr == null) {
            return gson.toJsonTree(textEditsMap);
        }
        NodeList<IntermediateClauseNode> intermediateClauseNodes = queryExpr.queryPipeline().intermediateClauses();
        if (index >= intermediateClauseNodes.size()) {
            return gson.toJsonTree(textEditsMap);
        }
        IntermediateClauseNode intermediateClauseNode = intermediateClauseNodes.get(index);
        textEdits.add(new TextEdit(CommonUtils.toRange(intermediateClauseNode.lineRange()), ""));
        return gson.toJsonTree(textEditsMap);
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
            case GROUP_BY: {
                if (properties.name() != null && properties.type() != null) {
                    return "group by " + properties.type() + " " + properties.name() +
                            " = " + properties.expression();
                }
                return "group by " + properties.expression();
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
            case "join": {
                String joinClause = properties.isOuter() ? "outer join " : "join ";
                joinClause = joinClause + properties.type() + " " + properties.name() +
                        " in " + properties.expression() + " on " + properties.lhsExpression() +
                        " equals " + properties.rhsExpression();
                return joinClause;
            }
            default:
                throw new IllegalStateException("Unknown clause type: " + type);
        }
    }

    public JsonElement getQuery(SemanticModel semanticModel, JsonElement cd, JsonElement mp, String targetField,
                                String clauseType, Path filePath) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());
        TargetNode targetNode = getTargetNode(stNode, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }
        MatchingNode matchingNode = targetNode.matchingNode();
        if (matchingNode == null) {
            return null;
        }

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        Mapping mapping = gson.fromJson(mp, Mapping.class);
        ExpressionNode expr = matchingNode.expr();
        QueryExpressionNode queryExpr = matchingNode.queryExpr();
        TypeSymbol targetTypeSymbol =
                getTargetType(targetNode.typeSymbol(), mapping.output(), queryExpr == null ? expr : queryExpr);
        if (targetTypeSymbol == null) {
            return null;
        }
        targetTypeSymbol = CommonUtils.getRawType(targetTypeSymbol);

        if (clauseType.equals("collect")) {
            String query = getQuerySource(mapping.expression(), "collect", targetTypeSymbol);
            genSource(expr, mapping.output().split(DOT), 1, new StringBuilder(), query, null, textEdits);
        } else {
            if (targetTypeSymbol.typeKind() == TypeDescKind.ARRAY) {
                TypeSymbol typeSymbol =
                        CommonUtils.getRawType(((ArrayTypeSymbol) targetTypeSymbol).memberTypeDescriptor());
                String query = getQuerySource(mapping.expression(), "select", typeSymbol);
                genSource(expr, mapping.output().split(DOT), 1, new StringBuilder(), query, null, textEdits);
            }
        }
        return gson.toJsonTree(textEditsMap);
    }

    private String getQuerySource(String inputExpr, String finalClause, TypeSymbol typeSymbol) {
        String[] splits = inputExpr.split(DOT);
        return "from var " + splits[splits.length - 1] + ITEM + " in " + inputExpr + " " +
                finalClause + " " + DefaultValueGeneratorUtil.getDefaultValueForType(typeSymbol);
    }

    public TypeDefinitionSymbol getMatchedTypeDefSymbol(String prefix, String type, SemanticModel defaultModuleSM) {
        List<ModuleSymbol> modules = getModuleSymbols(defaultModuleSM);
        for (ModuleSymbol module : modules) {
            if (!module.id().modulePrefix().equals(prefix)) {
                continue;
            }
            for (TypeDefinitionSymbol typeDefinition : module.typeDefinitions()) {
                Optional<String> name = typeDefinition.getName();
                if (name.isPresent() && name.get().equals(type)) {
                    return typeDefinition;
                }
            }
        }
        return null;
    }

    private List<ModuleSymbol> getModuleSymbols(SemanticModel semanticModel) {
        List<ModuleSymbol> modules = new ArrayList<>();
        for (ImportDeclarationNode importNode : ((ModulePartNode) this.document.syntaxTree().rootNode()).imports()) {
            Optional<Symbol> symbol = semanticModel.symbol(importNode);
            if (symbol.isPresent() && symbol.get().kind() == SymbolKind.MODULE) {
                modules.add((ModuleSymbol) symbol.get());
            }
        }
        return modules;
    }

    public JsonElement getVisualizableProperties(SemanticModel sm, JsonElement node) {
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

        String symbolStr = codedata.symbol();
        if (symbolStr.startsWith("[") && symbolStr.contains(",")) {
            return gson.toJsonTree(new DataMapCapability(true, "[]"));
        }

        String[] typeParts = symbolStr.split("\\[", 2);
        String type = typeParts[0];
        boolean isArray = (typeParts.length > 1 ? "[" + typeParts[1] : "").startsWith("[");
        boolean isMapType = type.startsWith("map<") && type.endsWith(">");

        if (isMapType) {
            if (isArray) {
                return gson.toJsonTree(new DataMapCapability(true, "[]"));
            }
            return gson.toJsonTree(new DataMapCapability(true, "{}"));
        }

        DataMapCapability dataMapCapability = getDataMapperCapabilityForPrimitiveTypes(type, isArray);
        if (dataMapCapability != null) {
            return gson.toJsonTree(dataMapCapability);
        }

        for (Symbol symbol : semanticModel.moduleSymbols()) {
            if (symbol.kind() != SymbolKind.TYPE_DEFINITION) {
                continue;
            }
            if (symbol.getName().isEmpty() || !symbol.getName().get().equals(type)) {
                continue;
            }
            return gson.toJsonTree(getDataMapCapability((TypeDefinitionSymbol) symbol, isArray));
        }

        String[] typeSegments = type.split(":");
        boolean hasModulePrefix = typeSegments.length > 1 && !typeSegments[0].isEmpty();
        if (hasModulePrefix) {
            String prefix = typeSegments[0];
            String typeName = typeSegments[1];
            TypeDefinitionSymbol matchedSymbol = getMatchedTypeDefSymbol(prefix, typeName, semanticModel);
            if (matchedSymbol != null) {
                return gson.toJsonTree(getDataMapCapability(matchedSymbol, isArray));
            }
        }
        return null;
    }

    private DataMapCapability getDataMapCapability(TypeDefinitionSymbol typeDefSymbol, Boolean isArray) {
        TypeSymbol typeSymbol = typeDefSymbol.typeDescriptor();
        TypeSymbol rawTypeSymbol = CommonUtils.getRawType(typeSymbol);
        TypeDescKind kind = rawTypeSymbol.typeKind();
        if (kind == TypeDescKind.TUPLE) {
            return new DataMapCapability(true, "[]");
        } else if (isEffectiveRecordType(kind, rawTypeSymbol)) {
            if (isArray) {
                return new DataMapCapability(true, "[]");
            }
            return new DataMapCapability(true, "{}");
        } else if (kind == TypeDescKind.MAP) {
            if (isArray) {
                return new DataMapCapability(true, "[]");
            }
            return new DataMapCapability(true, "{}");
        } else if (kind == TypeDescKind.INT || kind == TypeDescKind.DECIMAL || kind == TypeDescKind.FLOAT) {
            return new DataMapCapability(false, "0");
        } else if (kind == TypeDescKind.BOOLEAN) {
            return new DataMapCapability(false, "false");
        } else if (kind == TypeDescKind.STRING) {
            return new DataMapCapability(false, "\"\"");
        }
        return null;
    }

    private DataMapCapability getDataMapperCapabilityForPrimitiveTypes(String type, Boolean isArray) {
        switch (type) {
            case INT, FLOAT, DECIMAL -> {
                return new DataMapCapability(false, isArray ? "[]" : "0");
            }
            case BOOLEAN -> {
                return new DataMapCapability(false, isArray ? "[]" : "false");
            }
            case STRING -> {
                return new DataMapCapability(false, isArray ? "[]" : "\"\"");
            }
            default -> {
                return null;
            }
        }
    }

    private boolean isEffectiveRecordType(TypeDescKind kind, TypeSymbol rawTypeSymbol) {
        if (kind == TypeDescKind.ARRAY) {
            TypeDescKind memberKind = ((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor().typeKind();
            return isEffectiveRecordType(memberKind, ((ArrayTypeSymbol) rawTypeSymbol).memberTypeDescriptor());
        }
        return kind == TypeDescKind.RECORD;
    }

    public JsonElement addElement(SemanticModel semanticModel, JsonElement cd, Path filePath, String targetField,
                                  String outputId) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        TargetNode targetNode = getTargetNode(stNode, targetField, semanticModel);
        if (targetNode == null) {
            return gson.toJsonTree(textEditsMap);
        }
        MatchingNode matchingNode = targetNode.matchingNode();
        if (matchingNode == null) {
            return gson.toJsonTree(textEditsMap);
        }
        TypeSymbol targetType = targetNode.typeSymbol();
        if (matchingNode.queryExpr() != null) {
            targetType = resolveArrayMemberType(targetType);
        }
        targetType = resolveArrayMemberType(getTargetType(targetType, outputId));
        String defaultVal = DefaultValueGeneratorUtil.getDefaultValueForType(targetType);

        MatchingNode matchingExpr = getTargetMappingExpr(matchingNode.expr(), outputId);
        if (matchingExpr == null) {
            return gson.toJsonTree(textEditsMap);
        }
        ExpressionNode expr = matchingExpr.expr();
        if (expr.kind() != SyntaxKind.LIST_CONSTRUCTOR) {
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
        return gson.toJsonTree(textEditsMap);
    }

    private TypeSymbol resolveArrayMemberType(TypeSymbol typeSymbol) {
        TypeSymbol rawType = CommonUtils.getRawType(typeSymbol);
        if (rawType.typeKind() == TypeDescKind.ARRAY) {
            return ((ArrayTypeSymbol) rawType).memberTypeDescriptor();
        }
        return rawType;
    }

    private TypeSymbol getTargetType(TypeSymbol typeSymbol, String targetField, ExpressionNode expr) {
        if (targetField == null || targetField.isEmpty()) {
            return typeSymbol;
        }
        String[] splits = targetField.split(DOT);
        if (splits.length == 1 && expr.kind() == SyntaxKind.QUERY_EXPRESSION) {
            ExpressionNode currentExpr = expr;
            while (currentExpr.kind() == SyntaxKind.QUERY_EXPRESSION) {
                if (typeSymbol.typeKind() != TypeDescKind.ARRAY) {
                    break;
                }
                typeSymbol = CommonUtils.getRawType(((ArrayTypeSymbol) typeSymbol).memberTypeDescriptor());
                ClauseNode clauseNode = ((QueryExpressionNode) currentExpr).resultClause();
                if (clauseNode.kind() == SyntaxKind.SELECT_CLAUSE) {
                    currentExpr = ((SelectClauseNode) clauseNode).expression();
                } else {
                    currentExpr = ((CollectClauseNode) clauseNode).expression();
                }
            }
            return typeSymbol;
        }
        return getTargetType(typeSymbol, targetField);
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
                if (targetType.typeKind() == TypeDescKind.ARRAY) {
                    targetType = CommonUtils.getRawType(((ArrayTypeSymbol) targetType).memberTypeDescriptor());
                }
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
        TargetNode targetNode = getTargetNode(stNode, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }

        TypeSymbol typeSymbol = getTargetType(targetNode.typeSymbol(), fieldId);
        Property.Builder<DataMapManager> dataMapManagerBuilder = new Property.Builder<>(this);
        dataMapManagerBuilder = dataMapManagerBuilder
                .type(Property.ValueType.EXPRESSION)
                .typeConstraint(CommonUtils.getTypeSignature(semanticModel, typeSymbol, false));
        LineRange lineRange = getFieldExprRange(targetNode.matchingNode().expr(), 1, fieldId.split(DOT));
        if (lineRange != null) {
            dataMapManagerBuilder = dataMapManagerBuilder.codedata().lineRange(lineRange).stepOut();
        }
        return gson.toJsonTree(dataMapManagerBuilder.build());
    }

    public JsonElement getTargetFieldPosition(SemanticModel semanticModel, JsonElement cd, String targetField) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());

        TargetNode targetNode = getTargetNode(stNode, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }

        MatchingNode matchingNode = targetNode.matchingNode();
        LineRange lineRange;
        if (matchingNode.queryExpr() == null) {
            lineRange = matchingNode.expr().lineRange();
        } else {
            lineRange = resultClausePosition(matchingNode.expr());
        }

        Property.Builder<DataMapManager> dataMapManagerBuilder = new Property.Builder<>(this);
        dataMapManagerBuilder = dataMapManagerBuilder
                .type(Property.ValueType.EXPRESSION)
                .codedata()
                    .lineRange(lineRange)
                .stepOut();
        return gson.toJsonTree(dataMapManagerBuilder.build());
    }

    public JsonElement getClausePosition(SemanticModel semanticModel, JsonElement cd, String targetField, int index) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());

        TargetNode targetNode = getTargetNode(stNode, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }

        MatchingNode matchingNode = targetNode.matchingNode();
        if (matchingNode == null) {
            return null;
        }

        QueryExpressionNode queryExprNode = matchingNode.queryExpr();
        if (queryExprNode == null) {
            return null;
        }

        NodeList<IntermediateClauseNode> intermediateClauses = queryExprNode.queryPipeline().intermediateClauses();
        if (index < 0) {
            if (intermediateClauses.isEmpty()) {
                return gson.toJsonTree(queryExprNode.resultClause().lineRange().startLine());
            } else {
                return gson.toJsonTree(intermediateClauses.get(0).lineRange().startLine());
            }
        } else if (index >= intermediateClauses.size()) {
            return gson.toJsonTree(queryExprNode.resultClause().lineRange().startLine());
        } else {
            return gson.toJsonTree(intermediateClauses.get(index).lineRange().startLine());
        }
    }

    public JsonElement subMapping(JsonElement cd, String view) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode stNode = getNode(codedata.lineRange());
        ExpressionNode initializer = getMappingExpr(stNode);
        if (initializer == null) {
            return null;
        }
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
                JsonElement jsonElement = setPosition(((VariableDeclarationNode) stNode).typedBindingPattern(),
                        stNode.lineRange(), name);
                if (jsonElement != null) {
                    return jsonElement;
                }
            } else if (stNode.kind() == SyntaxKind.MODULE_VAR_DECL) {
                JsonElement jsonElement = setPosition(((ModuleVariableDeclarationNode) stNode).typedBindingPattern(),
                        stNode.lineRange(), name);
                if (jsonElement != null) {
                    return jsonElement;
                }
            } else if (stNode.kind() == SyntaxKind.LET_VAR_DECL) {
                JsonElement jsonElement = setPosition(((LetVariableDeclarationNode) stNode).typedBindingPattern(),
                        stNode.lineRange(), name);
                if (jsonElement != null) {
                    return jsonElement;
                }
            } else if (stNode.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                FunctionDefinitionNode funcDefNode = (FunctionDefinitionNode) stNode;
                FunctionBodyNode funcBodyNode = funcDefNode.functionBody();
                if (funcBodyNode.kind() == SyntaxKind.EXPRESSION_FUNCTION_BODY) {
                    if (funcDefNode.functionName().text().equals(name)) {
                        return gson.toJsonTree(new Codedata.Builder<>(null)
                                .lineRange(stNode.lineRange())
                                .node(NodeKind.VARIABLE)
                                .build());
                    }
                }
                return null;
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
                                    fromClauseNode.expression().toSourceCode().trim(), null, null, null, false)));
                }
                case WHERE_CLAUSE -> {
                    WhereClauseNode whereClauseNode = (WhereClauseNode) intermediateClause;
                    ExpressionNode expression = whereClauseNode.expression();
                    intermediateClauses.add(new Clause(WHERE,
                            new Properties(null, null, expression.toSourceCode().trim(), null, null, null, false)));
                }
                case LET_CLAUSE -> {
                    LetClauseNode letClauseNode = (LetClauseNode) intermediateClause;
                    SeparatedNodeList<LetVariableDeclarationNode> letVars = letClauseNode.letVarDeclarations();
                    LetVariableDeclarationNode letVar = letVars.get(0);
                    TypedBindingPatternNode typedBindingPattern = letVar.typedBindingPattern();
                    intermediateClauses.add(new Clause(LET,
                            new Properties(typedBindingPattern.bindingPattern().toSourceCode().trim(),
                                    typedBindingPattern.typeDescriptor().toSourceCode().trim(),
                                    letVar.expression().toSourceCode().trim(), null, null, null, false)));
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
                            new Properties(null, null,
                                    orderKey.expression().toSourceCode().trim(), direction, null, null, false)));
                }
                case LIMIT_CLAUSE -> {
                    LimitClauseNode limitClause = (LimitClauseNode) intermediateClause;
                    intermediateClauses.add(new Clause("limit", new Properties(null, null,
                            limitClause.expression().toSourceCode().trim(), null, null, null, false)));
                }
                case JOIN_CLAUSE -> {
                    JoinClauseNode joinClauseNode = (JoinClauseNode) intermediateClause;
                    TypedBindingPatternNode typedBindingPattern = joinClauseNode.typedBindingPattern();
                    OnClauseNode onClauseNode = joinClauseNode.joinOnCondition();
                    intermediateClauses.add(new Clause("join",
                            new Properties(typedBindingPattern.bindingPattern().toSourceCode().trim(),
                            typedBindingPattern.typeDescriptor().toSourceCode().trim(),
                            joinClauseNode.expression().toSourceCode().trim(), null,
                            onClauseNode.lhsExpression().toSourceCode().trim(),
                            onClauseNode.rhsExpression().toSourceCode().trim(),
                            joinClauseNode.outerKeyword().isPresent())));
                }
                case GROUP_BY_CLAUSE -> {
                    GroupByClauseNode groupByClause = (GroupByClauseNode) intermediateClause;
                    SeparatedNodeList<Node> groupingKeys = groupByClause.groupingKey();
                    if (!groupingKeys.isEmpty()) {
                        Node groupingKey = groupingKeys.get(0);
                        if (groupingKey.kind() == SyntaxKind.GROUPING_KEY_VAR_DECLARATION) {
                            GroupingKeyVarDeclarationNode varDecl = (GroupingKeyVarDeclarationNode) groupingKey;
                            intermediateClauses.add(new Clause(GROUP_BY,
                                    new Properties(varDecl.simpleBindingPattern().toSourceCode().trim(),
                                            varDecl.typeDescriptor().toSourceCode().trim(),
                                            varDecl.expression().toSourceCode().trim(),
                                            null, null, null, false)));
                        } else {
                            intermediateClauses.add(new Clause(GROUP_BY,
                                    new Properties(null, null, groupingKey.toSourceCode().trim(),
                                            null, null, null, false)));
                        }
                    }
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
        ExpressionNode expr = getMappingExpr(node);
        if (expr == null) {
            return null;
        }

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
            Range range;
            if (expr.kind() == SyntaxKind.LET_EXPRESSION) {
                newText = ", " + newText;
                LetExpressionNode letExpr = (LetExpressionNode) expr;
                SeparatedNodeList<LetVariableDeclarationNode> letVarDecls = letExpr.letVarDeclarations();
                if (index >= letVarDecls.size()) {
                    range = CommonUtils.toRange(letVarDecls.get(letVarDecls.size() - 1).lineRange().endLine());
                } else {
                    LineRange lineRange = letVarDecls.get(index).lineRange();
                    Boolean isNew = codedata.isNew();
                    if (isNew != null && isNew) {
                        range = CommonUtils.toRange(lineRange.endLine());
                    } else {
                        range = CommonUtils.toRange(lineRange);
                    }
                }
            } else {
                newText = "let " + newText.split(";")[0] + " in ";
                range = CommonUtils.toRange(expr.lineRange().startLine());
            }
            te.setNewText(newText);
            te.setRange(range);
            found = true;
        }
        return gson.toJsonTree(source);
    }

    public JsonElement deleteSubMapping(Path filePath, JsonElement cd, int index) {
        Codedata codedata = gson.fromJson(cd, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        ExpressionNode expr = getMappingExpr(node);
        if (expr == null) {
            return null;
        }
        if (expr.kind() != SyntaxKind.LET_EXPRESSION) {
            return null;
        }

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        List<TextEdit> textEdits = new ArrayList<>();
        textEditsMap.put(filePath, textEdits);

        LetExpressionNode letExpr = (LetExpressionNode) expr;
        SeparatedNodeList<LetVariableDeclarationNode> letVarDecls = letExpr.letVarDeclarations();
        if (index >= letVarDecls.size()) {
            return null;
        }
        Range range;
        if (letVarDecls.size() == 1) {
            range = CommonUtils.toRange(letExpr.letKeyword().lineRange().startLine(),
                    letExpr.expression().lineRange().startLine());
        } else {
            LineRange lineRange = letVarDecls.get(index).lineRange();
            if (index == letVarDecls.size() - 1) {
                range = CommonUtils.toRange(letVarDecls.get(index - 1).lineRange().endLine(), lineRange.endLine());
            } else {
                range = CommonUtils.toRange(lineRange.startLine(), letVarDecls.get(index + 1).lineRange().startLine());
            }
        }
        textEdits.add(new TextEdit(range, ""));
        return gson.toJsonTree(textEditsMap);
    }

    public JsonElement genMappingFunction(WorkspaceManager workspaceManager, SemanticModel semanticModel,
                                         Path filePath, JsonElement codeData, JsonElement mappings,
                                          JsonElement functionMetaData,
                                         String targetField, Boolean isCustomFunction) {
        Codedata codedata = gson.fromJson(codeData, Codedata.class);
        NonTerminalNode node = getNode(codedata.lineRange());
        TargetNode targetNode = getTargetNode(node, targetField, semanticModel);
        if (targetNode == null) {
            return null;
        }

        FunctionMetadata functionMetadata = gson.fromJson(functionMetaData, FunctionMetadata.class);
        Mapping mapping = gson.fromJson(mappings, Mapping.class);

        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        String functionName = genFunctionDef(workspaceManager,
                filePath, functionMetadata, textEditsMap, semanticModel, isCustomFunction);
        List<TextEdit> textEdits = new ArrayList<>();
        genSource(targetNode.matchingNode().expr(), mapping.output().split(DOT), 1, new StringBuilder(),
                functionName + "(" + mapping.expression() + ")", null, textEdits);
        textEditsMap.computeIfAbsent(filePath, k -> new ArrayList<>())
                .addAll(textEdits);
        return gson.toJsonTree(textEditsMap);
    }

    private LineRange getFieldExprRange(ExpressionNode expr, int idx, String[] names) {
        if (expr.kind() == SyntaxKind.MAPPING_CONSTRUCTOR) {
            String name = names[idx];
            MappingConstructorExpressionNode mappingCtrExpr = (MappingConstructorExpressionNode) expr;
            Map<String, SpecificFieldNode> mappingFields = convertMappingFieldsToMap(mappingCtrExpr);
            SpecificFieldNode mappingFieldNode = mappingFields.get(name);
            if (mappingFieldNode == null) {
                return null;
            } else {
                return getFieldExprRange(mappingFieldNode.valueExpr().orElseThrow(), idx + 1, names);
            }
        } else if (expr.kind() == SyntaxKind.LIST_CONSTRUCTOR) {
            ListConstructorExpressionNode listCtrExpr = (ListConstructorExpressionNode) expr;
            String name = names[idx];
            if (name.matches("\\d+")) {
                int index = Integer.parseInt(name);
                if (index >= listCtrExpr.expressions().size()) {
                    return null;
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

    private LineRange resultClausePosition(ExpressionNode expressionNode) {
        Node node = expressionNode.parent();
        while (node != null) {
            if (node.kind() == SyntaxKind.SELECT_CLAUSE || node.kind() == SyntaxKind.COLLECT_CLAUSE) {
                return node.lineRange();
            }
            node = node.parent();
        }
        throw new IllegalStateException("Result clause not found for the expression node");
    }

    private String genFunctionDef(WorkspaceManager workspaceManager, Path filePath,
                                        FunctionMetadata functionMetadata, Map<Path,
                    List<TextEdit>> textEditsMap, SemanticModel semanticModel, Boolean isCustomFunction) {
        List<Parameter> parameters = functionMetadata.parameters();
        List<String> paramNames = new ArrayList<>();
        for (Parameter parameter : parameters) {
            String paramTypeName = parameter.type();
            if (parameter.isOptional()) {
                if (!paramTypeName.contains("?") && !paramTypeName.contains("()")) {
                    paramTypeName = paramTypeName + "?";
                }
            }
            paramNames.add(paramTypeName + " " + parameter.name());
        }

        Path functionsFilePath;
        String expressionBody = null;
        if (isCustomFunction) {
            functionsFilePath = workspaceManager.projectRoot(filePath).resolve("functions.bal");
        } else {
            functionsFilePath = workspaceManager.projectRoot(filePath).resolve("data_mappings.bal");
            expressionBody = getExpressionBody(functionMetadata.returnType().type());
        }
        try {
            workspaceManager.loadProject(filePath);
            Range functionRange;
            Document document = workspaceManager.document(functionsFilePath).orElse(null);
            if (document != null) {
                functionRange = CommonUtils.toRange(document.syntaxTree().rootNode().lineRange().endLine());
            } else {
                functionRange = new Range(new Position(0, 0), new Position(0, 0));
            }

            ReturnType returnType = functionMetadata.returnType();
            String functionName = getFunctionName(parameters, returnType, semanticModel);
            List<TextEdit> textEdits = new ArrayList<>();

            if (functionMetadata.importTypeInfo() != null && !functionMetadata.importTypeInfo().isEmpty()) {
                textEdits.addAll(generateImportTextEdits(functionMetadata.importTypeInfo(), document));
            }

            if (isCustomFunction) {
                textEdits.add(new TextEdit(functionRange, System.lineSeparator() + "function " +
                        functionName + "(" + String.join(", ", paramNames) + ") returns " + returnType.type + " {}"));
            } else {
                textEdits.add(new TextEdit(functionRange, System.lineSeparator() + "function " +
                        functionName + "(" + String.join(", ", paramNames) + ") returns " + returnType.type + " => " +
                        expressionBody + ";"));
            }
            textEditsMap.put(functionsFilePath, textEdits);
            return functionName;
        } catch (WorkspaceDocumentException | EventSyncException e) {
            throw new RuntimeException(e);
        }
    }

    private List<TextEdit> generateImportTextEdits(List<TypeInfo> importTypeInfoList, Document document) {
        List<TextEdit> importEdits = new ArrayList<>();

        if (document == null) {
            TreeSet<String> importStmts = new TreeSet<>();
            for (TypeInfo typeInfo : importTypeInfoList) {
                importStmts.add(getImportStmt(typeInfo.orgName(), typeInfo.moduleName()));
            }
            if (!importStmts.isEmpty()) {
                String importsStmts = String.join("", importStmts);
                importEdits.add(new TextEdit(CommonUtils.toRange(0, 0), importsStmts));
            }
            return importEdits;
        }

        ModulePartNode modulePartNode = document.syntaxTree().rootNode();
        TreeSet<String> importStmts = new TreeSet<>();

        for (TypeInfo typeInfo : importTypeInfoList) {
            if (!CommonUtils.importExists(modulePartNode, typeInfo.orgName(), typeInfo.moduleName())) {
                importStmts.add(getImportStmt(typeInfo.orgName(), typeInfo.moduleName()));
            }
        }

        if (!importStmts.isEmpty()) {
            String importsStmts = String.join("", importStmts);
            importEdits.add(new TextEdit(CommonUtils.toRange(modulePartNode.lineRange().startLine()),
                    importsStmts));
        }

        return importEdits;
    }

    private static String getImportStmt(String org, String module) {
        return String.format("import %s/%s;%n", org, module);
    }

    private static String getExpressionBody(String returnType) {
        if (returnType == null || returnType.isEmpty()) {
            return "{}";
        }
        if (returnType.contains("[]")) {
            return "[]";
        }

        return  switch (returnType) {
            case INT -> "0";
            case FLOAT -> "0.0";
            case DECIMAL -> "0.0d";
            case BOOLEAN -> "true";
            case STRING -> "\"\"";
            default -> "{}";
        };

    }

    private static String getFunctionName(List<Parameter> parameters, ReturnType returnType,
                                          SemanticModel semanticModel) {
        String functionName = "map";
        if (parameters.isEmpty()) {
            return functionName;
        }
        Parameter firstParam = parameters.getFirst();
        return functionName + NameUtil.toCamelCase(getFunctionMappingName(firstParam, returnType, semanticModel));
    }

    private static String getFunctionMappingName(Parameter firstParam, ReturnType returnType,
                                                 SemanticModel semanticModel) {
        String firstParamKind = firstParam.kind();
        String returnTypeKind = returnType.kind();
        int highestNumber = findHighestFunctionNumber(firstParamKind, returnTypeKind, semanticModel);
        return " " + firstParamKind + " To " + returnTypeKind + (highestNumber + 1);
    }

    private static int findHighestFunctionNumber(String firstParamKind, String returnTypeKind,
                                                 SemanticModel semanticModel) {
        int highestNumber = 0;
        String functionName = NameUtil.toCamelCase("map " + firstParamKind + " To " + returnTypeKind);
        for (Symbol symbol : semanticModel.moduleSymbols()) {
            if (symbol.kind() != SymbolKind.FUNCTION) {
                continue;
            }
            Optional<String> name = symbol.getName();
            if (name.isEmpty() || !name.get().startsWith(functionName)) {
                continue;
            }
            String suffix = name.get().substring(functionName.length());
            if (!suffix.matches("\\d+")) {
                continue;
            }
            int number = Integer.parseInt(suffix);
            highestNumber = Math.max(highestNumber, number);
        }
        return highestNumber;
    }

    private String getDefaultValue(String kind) {
        switch (kind) {
            case INT, FLOAT, DECIMAL -> {
                return "0";
            }
            case BOOLEAN -> {
                return "false";
            }
            case STRING -> {
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

    private NonTerminalNode getNode(LineRange lineRange) {
        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        return modulePartNode.findNode(TextRange.from(start, end - start), true);
    }

    private record Model(List<MappingPort> inputs, MappingPort output, List<MappingPort> subMappings,
                         List<Mapping> mappings, Query query, Map<String, MappingPort> refs) {

        private Model(List<MappingPort> inputs, MappingPort output, List<Mapping> mappings) {
            this(inputs, output, null, mappings, null, null);
        }

        private Model(List<MappingPort> inputs, MappingPort output, Query query) {
            this(inputs, output, null, new ArrayList<>(), query, null);
        }

        private Model(List<MappingPort> inputs, MappingPort output, List<Mapping> mappings,
                      Query query, Map<String, MappingPort> references) {
            this(inputs, output, null, mappings, query, references);
        }

        private Model(List<MappingPort> inputs, MappingPort output, List<MappingPort> subMappings,
                     List<Mapping> mappings, Query query, Map<String, MappingPort> refs) {
            this.inputs = inputs;
            this.output = output;
            this.subMappings = subMappings;
            this.mappings = mappings;
            this.query = query;
            this.refs = refs;
        }
    }

    private record Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                           List<MappingElements> elements, Boolean isQueryExpression, Boolean isFunctionCall,
                           Map<String, String> imports, LineRange functionRange, List<String> elementAccessIndex) {

        private Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                        List<MappingElements> elements) {
            this(output, inputs, expression, diagnostics, elements, null,
                    null, null, null, null);
        }

        private Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                        List<MappingElements> elements, Boolean isQueryExpression) {
            this(output, inputs, expression, diagnostics, elements, isQueryExpression,
                    null, null, null, null);
        }

        private Mapping(String output, List<String> inputs, String expression, List<String> diagnostics,
                        List<MappingElements> elements, Boolean isQueryExpression, Boolean isFunctionCall,
                        LineRange customFunctionRange) {
            this(output, inputs, expression, diagnostics, elements, isQueryExpression, isFunctionCall, null,
                    customFunctionRange, null);
        }
    }

    private record FunctionMetadata(List<Parameter> parameters, ReturnType returnType,
                                    List<TypeInfo> importTypeInfo) {
    }

    private record Parameter(String name, String type, boolean isOptional, boolean isNullable, String kind) {
    }

    private record ReturnType(String type, String kind) {
    }

    private record Query(String output, List<String> inputs, Clause fromClause,
                         List<Clause> intermediateClauses, Clause resultClause) {

    }

    private record Properties(String name, String type, String expression, String order,
                              String lhsExpression, String rhsExpression, boolean isOuter) {

    }

    private record Clause(String type, Properties properties) {

    }

    private record MappingElements(List<Mapping> mappings) {

    }

    private record DataMapCapability(boolean isDataMapped, String defaultValue) {

    }

    private static class MappingPort {
        String name;
        String displayName;
        String typeName;
        String kind;
        String category;
        String focusExpression;
        Boolean isRecursive;
        ModuleInfo moduleInfo;
        Boolean optional;
        String ref;
        TypeInfo typeInfo;

        MappingPort(String typeName, String kind) {
            this.typeName = typeName;
            this.kind = kind;
        }

        MappingPort(String typeName) {
            this.typeName = typeName;
        }

        MappingPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            this.name = name;
            this.displayName = displayName;
            this.typeName = typeName;
            this.kind = kind;
            this.optional = optional;
        }

        MappingPort(String name, String displayName, String typeName, String kind) {
            this.name = name;
            this.displayName = displayName;
            this.typeName = typeName;
            this.kind = kind;
        }

        MappingPort(String name, String displayName, String typeName, String kind, String reference) {
            this.name = name;
            this.displayName = displayName;
            this.typeName = typeName;
            this.kind = kind;
            this.ref = reference;
        }

        MappingPort(String name, String displayName, String typeName, String kind,
                    String reference, TypeInfo typeInfo) {
            this.name = name;
            this.displayName = displayName;
            this.typeName = typeName;
            this.kind = kind;
            this.ref = reference;
            this.typeInfo = typeInfo;
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

        String getDisplayName() {
            return this.displayName;
        }

        void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        void setIsRecursive(Boolean isRecursive) {
            this.isRecursive = isRecursive;
        }

        Boolean getIsRecursive() {
            return this.isRecursive;
        }

        ModuleInfo getModuleInfo() {
            return this.moduleInfo;
        }

        Boolean getOptional() {
            return this.optional;
        }

        void setOptional(Boolean optional) {
            this.optional = optional;
        }

        public String getFocusExpression() {
            return focusExpression;
        }

        public void setFocusExpression(String focusExpression) {
            this.focusExpression = focusExpression;
        }

        public TypeInfo getTypeInfo() {
            return typeInfo;
        }

        public String getRef() {
            return ref;
        }

    }

    private static class MappingRecordPort extends MappingPort {
        List<MappingPort> fields = new ArrayList<>();

        MappingRecordPort(String name, String displayName, String typeName, String kind) {
            super(name, displayName, typeName, kind);
        }

        MappingRecordPort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }

        MappingRecordPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            super(name, displayName, typeName, kind, optional);
        }

        MappingRecordPort(MappingRecordPort mappingRecordPort) {
            super(mappingRecordPort.name, mappingRecordPort.displayName, mappingRecordPort.typeName,
                    mappingRecordPort.kind, mappingRecordPort.ref, mappingRecordPort.typeInfo);
        }

        MappingRecordPort(MappingRecordPort mappingRecordPort, boolean isReferenceType) {
            super(mappingRecordPort.typeName, mappingRecordPort.kind);
            this.fields = mappingRecordPort.fields;
        }

    }

    private static class MappingArrayPort extends MappingPort {
        MappingPort member;

        MappingArrayPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            super(name, displayName, typeName, kind, optional);
        }

        MappingArrayPort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }

        void setMember(MappingPort member) {
            this.member = member;
        }

        MappingPort getMember() {
            return this.member;
        }
    }

    private static class MappingMapPort extends MappingPort {
        MappingPort value;

        MappingMapPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            super(name, displayName, typeName, kind, optional);
        }

        MappingMapPort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }

        void setValue(MappingPort value) {
            this.value = value;
        }

        MappingPort getValue() {
            return this.value;
        }
    }

    private static class MappingStreamPort extends MappingPort {
        MappingPort value;
        MappingPort completion;

        MappingStreamPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            super(name, displayName, typeName, kind, optional);
        }

        MappingStreamPort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }

        void setValue(MappingPort value) {
            this.value = value;
        }

        MappingPort getValue() {
            return this.value;
        }

        void setCompletion(MappingPort completion) {
            this.completion = completion;
        }

        MappingPort getCompletion() {
            return this.completion;
        }
    }

    private static class MappingEnumPort extends MappingPort {
        List<MappingPort> members = new ArrayList<>();

        MappingEnumPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            super(name, displayName, typeName, kind, optional);
        }

        MappingEnumPort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }
    }

    private static class MappingUnionPort extends MappingPort {
        List<MappingPort> members = new ArrayList<>();

        MappingUnionPort(String name, String displayName, String typeName, String kind, Boolean optional) {
            super(name, displayName, typeName, kind, optional);
        }

        MappingUnionPort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }
    }

    private static class MappingTuplePort extends MappingPort {
        List<MappingPort> members = new ArrayList<>();

        MappingTuplePort(String name, String displayName, String typeName, String kind, String reference) {
            super(name, displayName, typeName, kind, reference);
        }
    }

    public record TypeInfo(String orgName, String moduleName) {
    }

    private static class GenInputsVisitor extends NodeVisitor {
        private final List<String> inputs;
        private final List<DataMapManager.MappingPort> enumPorts;

        GenInputsVisitor(List<String> inputs, List<DataMapManager.MappingPort> enumPorts) {
            this.inputs = inputs;
            this.enumPorts = enumPorts;
        }

        @Override
        public void visit(FieldAccessExpressionNode node) {
            String source = node.toSourceCode().trim();
            String[] split = source.split("\\[");
            if (split.length > 1) {
                addInput(split[0]);
            } else {
                addInput(source);
            }
        }

        @Override
        public void visit(SimpleNameReferenceNode node) {
            String source = node.toSourceCode().trim();
            for (DataMapManager.MappingPort enumPort : enumPorts) {
                if (enumPort instanceof DataMapManager.MappingEnumPort mappingEnumPort) {
                    for (DataMapManager.MappingPort member : mappingEnumPort.members) {
                        if (member.typeName.equals(source) && member.kind.equals(source)) {
                            source = member.name;
                            break;
                        }
                    }
                }
            }
            addInput(source);
        }

        @Override
        public void visit(BinaryExpressionNode node) {
            node.lhsExpr().accept(this);
            node.rhsExpr().accept(this);
        }

        @Override
        public void visit(MethodCallExpressionNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(MappingConstructorExpressionNode node) {
            for (MappingFieldNode field : node.fields()) {
                if (field.kind() == SyntaxKind.SPECIFIC_FIELD) {
                    Optional<ExpressionNode> optFieldExpr = ((SpecificFieldNode) field).valueExpr();
                    optFieldExpr.ifPresent(expr -> expr.accept(this));
                } else {
                    field.accept(this);
                }
            }
        }

        @Override
        public void visit(IndexedExpressionNode node) {
            String source = node.toSourceCode().trim();
            String openBraceRemoved = source.replace("[", ".");
            String middleBracesRemoved = openBraceRemoved.replace("][", ".");
            String closedBraceRemoved = middleBracesRemoved.replace("]", "");
            addInput(closedBraceRemoved);

            SeparatedNodeList<ExpressionNode> keyExpressions = node.keyExpression();
            for (ExpressionNode keyExpr : keyExpressions) {
                keyExpr.accept(this);
            }
        }

        @Override
        public void visit(QueryExpressionNode node) {
            node.queryPipeline().fromClause().accept(this);
            for (IntermediateClauseNode intermediateClauseNode : node.queryPipeline().intermediateClauses()) {
                intermediateClauseNode.accept(this);
            }
        }

        @Override
        public void visit(JoinClauseNode node) {
            addInput(node.expression().toSourceCode().trim());
        }

        @Override
        public void visit(FromClauseNode node) {
            addInput(node.expression().toSourceCode().trim());
        }

        @Override
        public void visit(FunctionCallExpressionNode node) {
            for (FunctionArgumentNode argument : node.arguments()) {
                switch (argument.kind()) {
                    case POSITIONAL_ARG -> ((PositionalArgumentNode) argument).expression().accept(this);
                    case NAMED_ARG -> ((NamedArgumentNode) argument).expression().accept(this);
                    case REST_ARG -> ((RestArgumentNode) argument).expression().accept(this);
                    default -> {
                    }
                }
            }
        }

        @Override
        public void visit(BracedExpressionNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(SpreadMemberNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(CheckExpressionNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(OptionalFieldAccessExpressionNode node) {
            addInput(node.toSourceCode());
        }

        private void addInput(String input) {
            inputs.add(input.trim().replace("?", ""));
        }
    }

    private static class ArrayIndexExtractorVisitor extends NodeVisitor {
        private final List<String> indices;

        ArrayIndexExtractorVisitor(List<String> indices) {
            this.indices = indices;
        }

        @Override
        public void visit(IndexedExpressionNode node) {
            node.containerExpression().accept(this);

            SeparatedNodeList<ExpressionNode> keyExpressions = node.keyExpression();
            for (ExpressionNode keyExpr : keyExpressions) {
                String indexValue = extractIndexValue(keyExpr);
                indices.add(indexValue);
            }
        }

        private String extractIndexValue(ExpressionNode keyExpr) {
            return keyExpr.toSourceCode().trim();
        }

        @Override
        public void visit(FieldAccessExpressionNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(OptionalFieldAccessExpressionNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(BracedExpressionNode node) {
            node.expression().accept(this);
        }

        @Override
        public void visit(CheckExpressionNode node) {
            node.expression().accept(this);
        }
    }
}
