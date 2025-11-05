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

package io.ballerina.designmodelgenerator.core;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassFieldSymbol;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.ObjectTypeSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.AssignmentStatementNode;
import io.ballerina.compiler.syntax.tree.CheckExpressionNode;
import io.ballerina.compiler.syntax.tree.ExplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ImplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ListConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.NewExpressionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeFactory;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ObjectFieldNode;
import io.ballerina.compiler.syntax.tree.ParenthesizedArgList;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.SimpleNameReferenceNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.VariableDeclarationNode;
import io.ballerina.designmodelgenerator.core.model.Connection;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.LineRange;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Find connections for the given symbol.
 *
 * @since 1.0.0
 */
public class ConnectionFinder {

    private final SemanticModel semanticModel;
    private final Map<String, ModulePartNode> documentMap;
    private final Path rootPath;
    private final IntermediateModel intermediateModel;

    public ConnectionFinder(SemanticModel semanticModel, Path rootPath,
                            Map<String, ModulePartNode> documentMap,
                            IntermediateModel intermediateModel) {
        this.semanticModel = semanticModel;
        this.documentMap = documentMap;
        this.rootPath = rootPath;
        this.intermediateModel = intermediateModel;
    }

    public void findConnection(Symbol symbol, List<String> referenceLocations) {
        if (symbol.getLocation().isEmpty()) {
            return;
        }
        String hashKey = String.valueOf(symbol.getLocation().get().hashCode());
        referenceLocations.add(hashKey);
        if (this.intermediateModel.connectionMap.containsKey(hashKey)) {
            Connection connection = this.intermediateModel.connectionMap.get(hashKey);
            for (String refLocation : referenceLocations) {
                intermediateModel.connectionMap.put(refLocation, connection);
                intermediateModel.uuidToConnectionMap.put(connection.getUuid(), connection);
            }
            return;
        }
        if (symbol instanceof ClassFieldSymbol classFieldSymbol) {
            if (classFieldSymbol.hasDefaultValue()) {
                Location location = classFieldSymbol.getLocation().get();
                ModulePartNode modulePartNode = documentMap.get(location.lineRange().fileName());
                NonTerminalNode node = modulePartNode.findNode(location.textRange());
                if (node instanceof ObjectFieldNode objectFieldNode) {
                    if (objectFieldNode.expression().isEmpty()) {
                        return;
                    }
                    if (isNewConnection(objectFieldNode.expression().get())) {
                        LineRange lineRange = node.lineRange();
                        String sortText = lineRange.fileName() + lineRange.startLine().line();
                        String icon = CommonUtils.generateIcon(classFieldSymbol.typeDescriptor());
                        Connection connection = new Connection(objectFieldNode.fieldName().text(),
                                sortText, getLocation(lineRange), Connection.Scope.LOCAL, icon);
                        for (String refLocation : referenceLocations) {
                            intermediateModel.connectionMap.put(String.valueOf(refLocation), connection);
                            intermediateModel.uuidToConnectionMap.put(connection.getUuid(), connection);
                        }
                    } else {
                        Optional<Symbol> valueSymbol = semanticModel.symbol(objectFieldNode.expression().get());
                        if (valueSymbol.isPresent()) { // TODO: handle for function calls
                            findConnection(valueSymbol.get(), referenceLocations);
                        }
                    }
                }
            } else {
                List<Location> references = this.semanticModel.references(classFieldSymbol);
                for (Location location : references) {
                    ModulePartNode modulePartNode = documentMap.get(location.lineRange().fileName());
                    NonTerminalNode node = modulePartNode.findNode(location.textRange()).parent();
                    if (node instanceof AssignmentStatementNode assignmentStatementNode) {
                        if (isNewConnection(assignmentStatementNode.expression())) {
                            LineRange lineRange = node.lineRange();
                            String sortText = lineRange.fileName() + lineRange.startLine().line();
                            String icon = CommonUtils.generateIcon(classFieldSymbol.typeDescriptor());
                            Connection connection = new Connection(symbol.getName().get(), sortText,
                                    getLocation(lineRange), Connection.Scope.LOCAL, icon);
                            for (String refLocation : referenceLocations) {
                                intermediateModel.connectionMap.put(String.valueOf(refLocation), connection);
                                intermediateModel.uuidToConnectionMap.put(connection.getUuid(), connection);
                            }
                            // Process constructor arguments to find dependent connections
                            TypeSymbol rawType = CommonUtils.getRawType(classFieldSymbol.typeDescriptor());
                            if (rawType instanceof ClassSymbol) {
                                ExpressionNode expressionNode = assignmentStatementNode.expression();
                                if (expressionNode instanceof CheckExpressionNode checkExpressionNode) {
                                    expressionNode = checkExpressionNode.expression();
                                }
                                if (expressionNode instanceof NewExpressionNode newExpressionNode) {
                                    SeparatedNodeList<FunctionArgumentNode> argList = getArgList(newExpressionNode);
                                    List<ExpressionNode> argExprs = getInitMethodArgExprs(argList);
                                    for (ExpressionNode argExpr : argExprs) {
                                        handleInitMethodArgs(connection, argExpr);
                                    }
                                }
                            }
                        } else {
                            Optional<Symbol> valueSymbol = semanticModel.symbol(assignmentStatementNode.expression());
                            if (valueSymbol.isPresent()) { // TODO: handle for function calls
                                findConnection(valueSymbol.get(), referenceLocations);
                            }
                        }
                    }
                }
            }
        } else if (symbol instanceof VariableSymbol variableSymbol) {
            if (this.intermediateModel.connectionMap.containsKey(hashKey)) {
                Connection connection = this.intermediateModel.connectionMap.get(hashKey);
                for (String refLocation : referenceLocations) {
                    intermediateModel.connectionMap.put(refLocation, connection);
                    intermediateModel.uuidToConnectionMap.put(connection.getUuid(), connection);
                }
            } else {
                List<Location> references = this.semanticModel.references(variableSymbol);
                for (Location location : references) {
                    ModulePartNode modulePartNode = documentMap.get(location.lineRange().fileName());
                    NonTerminalNode node = modulePartNode.findNode(location.textRange()).parent();
                    if (node instanceof VariableDeclarationNode variableDeclarationNode) {
                        if (variableDeclarationNode.initializer().isEmpty()) {
                            continue;
                        }
                        TypeSymbol typeSymbol = CommonUtils.getRawType(variableSymbol.typeDescriptor());
                        if (typeSymbol instanceof ObjectTypeSymbol objectTypeSymbol) {
                            if (!objectTypeSymbol.qualifiers().contains(Qualifier.CLIENT)) {
                                continue;
                            }
                        }
                        if (isNewConnection(variableDeclarationNode.initializer().get())) {
                            LineRange lineRange = node.lineRange();
                            String sortText = lineRange.fileName() + lineRange.startLine().line();
                            String icon = CommonUtils.generateIcon(variableSymbol.typeDescriptor());
                            Connection connection = new Connection(symbol.getName().get(), sortText,
                                    getLocation(lineRange), Connection.Scope.LOCAL, icon, true);
                            for (String refLocation : referenceLocations) {
                                intermediateModel.connectionMap.put(String.valueOf(refLocation), connection);
                                intermediateModel.uuidToConnectionMap.put(connection.getUuid(), connection);
                            }
                        } else {
                            if (variableDeclarationNode.initializer().isPresent()) {
                                Optional<Symbol> valueSymbol = semanticModel.symbol(
                                        variableDeclarationNode.initializer().get());
                                if (valueSymbol.isPresent()) { // TODO: handle for function calls
                                    findConnection(valueSymbol.get(), referenceLocations);
                                }
                            }
                        }
                    } else if (node instanceof AssignmentStatementNode assignmentStatementNode) {
                        if (isNewConnection(assignmentStatementNode.expression())) {
                            LineRange lineRange = node.lineRange();
                            String sortText = lineRange.fileName() + lineRange.startLine().line();
                            Connection connection = new Connection(symbol.getName().get(), sortText,
                                    getLocation(lineRange), Connection.Scope.LOCAL, "");
                            for (String refLocation : referenceLocations) {
                                intermediateModel.connectionMap.put(String.valueOf(refLocation), connection);
                                intermediateModel.uuidToConnectionMap.put(connection.getUuid(), connection);
                            }
                        } else {
                            Optional<Symbol> valueSymbol = semanticModel.symbol(assignmentStatementNode.expression());
                            if (valueSymbol.isPresent()) { // TODO: handle for function calls
                                findConnection(valueSymbol.get(), referenceLocations);
                            }
                        }
                    }
                }
            }
        }
    }

    private boolean isNewConnection(ExpressionNode expressionNode) {
        return switch (expressionNode) {
            case ImplicitNewExpressionNode ignored -> true;
            case ExplicitNewExpressionNode ignored -> true;
            case CheckExpressionNode checkExpressionNode -> isNewConnection(checkExpressionNode.expression());
            default -> false;
        };
    }

    public io.ballerina.designmodelgenerator.core.model.Location getLocation(LineRange lineRange) {
        Path filePath = rootPath.resolve(lineRange.fileName());
        return new io.ballerina.designmodelgenerator.core.model.Location(
                filePath.toAbsolutePath().toString(), lineRange.startLine(),
                lineRange.endLine());
    }

    public SeparatedNodeList<FunctionArgumentNode> getArgList(NewExpressionNode newExpressionNode) {
        if (newExpressionNode instanceof ExplicitNewExpressionNode explicitNewExpressionNode) {
            return explicitNewExpressionNode.parenthesizedArgList().arguments();
        } else {
            Optional<ParenthesizedArgList> parenthesizedArgList = ((ImplicitNewExpressionNode) newExpressionNode)
                    .parenthesizedArgList();
            return parenthesizedArgList.map(ParenthesizedArgList::arguments)
                    .orElse(NodeFactory.createSeparatedNodeList());
        }
    }

    public List<ExpressionNode> getInitMethodArgExprs(SeparatedNodeList<FunctionArgumentNode> argumentNodes) {
        List<ExpressionNode> arguments = new ArrayList<>();

        for (int argIdx = 0; argIdx < argumentNodes.size(); argIdx++) {
            Node argument = argumentNodes.get(argIdx);
            if (argument == null) {
                continue;
            }
            SyntaxKind argKind = argument.kind();
            if (argKind == SyntaxKind.NAMED_ARG) {
                arguments.add(((NamedArgumentNode) argument).expression());
            } else if (argKind == SyntaxKind.POSITIONAL_ARG) {
                arguments.add(((PositionalArgumentNode) argument).expression());
            }
        }
        return arguments;
    }

    public void handleInitMethodArgs(Connection connection, ExpressionNode expressionNode) {
        if (expressionNode instanceof ListConstructorExpressionNode listConstructorExpressionNode) {
            for (Node expr : listConstructorExpressionNode.expressions()) {
                Optional<Symbol> symbol = this.semanticModel.symbol(expr);
                if (symbol.isEmpty()) {
                    continue;
                }
                if (symbol.get() instanceof FunctionSymbol functionSymbol) {
                    connection.addDependentFunction(functionSymbol.getName().orElse(""));
                }
            }
        } else if (expressionNode instanceof MappingConstructorExpressionNode mappingConstructorExpressionNode) {
            for (Node expr : mappingConstructorExpressionNode.fields()) {
                if (expr instanceof SpecificFieldNode specificFieldNode) {
                    if (specificFieldNode.valueExpr().isPresent()) {
                        handleInitMethodArgs(connection, specificFieldNode.valueExpr().get());
                    }
                }
            }
        } else if (expressionNode instanceof SimpleNameReferenceNode varRef) {
            Optional<Symbol> symbol = this.semanticModel.symbol(varRef);
            if (symbol.isPresent() && symbol.get() instanceof VariableSymbol variableSymbol &&
                    symbol.get().getLocation().isPresent()) {
                TypeSymbol rawType = CommonUtils.getRawType(variableSymbol.typeDescriptor());
                if (rawType instanceof ClassSymbol classSymbol) {
                    boolean isHiddenAiClass = CommonUtils.isHiddenAiClass(classSymbol);
                    if (classSymbol.qualifiers().contains(Qualifier.CLIENT) || isHiddenAiClass) {
                        String hashCode = String.valueOf(symbol.get().getLocation().get().hashCode());
                        if (intermediateModel.connectionMap.containsKey(hashCode)) {
                            Connection dependentConnection = intermediateModel.connectionMap.get(hashCode);
                            connection.addDependentConnection(dependentConnection.getUuid());
                        }
                    }
                }
            }
        }
    }
}
