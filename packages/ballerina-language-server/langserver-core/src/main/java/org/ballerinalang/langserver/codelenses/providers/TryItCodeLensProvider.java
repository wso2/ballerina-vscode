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

package org.ballerinalang.langserver.codelenses.providers;

import com.google.gson.JsonObject;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.codelenses.CodeLensUtil;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.eclipse.lsp4j.CodeLens;
import org.eclipse.lsp4j.Command;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Code lens provider for try-it functionality.
 *
 * @since 2201.13.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.codelenses.spi.LSCodeLensesProvider")
public class TryItCodeLensProvider extends AbstractCodeLensesProvider {

    private static final String TRY_IT_COMMAND = "ballerina.tryIt";
    private static final Set<String> SUPPORTED_MODULES = createSupportedModules();
    public static final String TRY_IT_TEST_KEY = "ballerina.tryit.test";

    public TryItCodeLensProvider() {
        super("tryit.CodeLenses");
    }

    @Override
    public boolean isEnabled(LanguageServerContext serverContext) {
        return true;
    }

    @Override
    public boolean validate(Node node) {
        return node.kind() == SyntaxKind.SERVICE_DECLARATION;
    }

    @Override
    public CodeLens getLens(DocumentServiceContext context, Node node) {
        if (node.kind() != SyntaxKind.SERVICE_DECLARATION) {
            return null;
        }
        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) node;
        Optional<SemanticModel> semanticModel = context.currentSemanticModel();
        if (semanticModel.isEmpty()) {
            return null;
        }

        SeparatedNodeList<ExpressionNode> expressions = serviceNode.expressions();
        if (expressions.isEmpty()) {
            return null;
        }

        ExpressionNode listenerExpression = expressions.get(0);
        Optional<TypeSymbol> typeSymbol = semanticModel.get().typeOf(listenerExpression);

        if (typeSymbol.isEmpty()) {
            return null;
        }

        TypeSymbol listenerTypeSymbol = getListenerTypeSymbol(typeSymbol.get(), semanticModel.get());
        if (listenerTypeSymbol == null) {
            return null;
        }

        Optional<ModuleSymbol> module = listenerTypeSymbol.getModule();
        if (module.isEmpty() || !SUPPORTED_MODULES.contains(module.get().id().moduleName())) {
            return null;
        }

        String basePath = getPathString(serviceNode.absoluteResourcePath());
        String listenerName = extractListenerName(listenerTypeSymbol.signature());

        JsonObject tryItArguments = new JsonObject();
        tryItArguments.addProperty("basePath", basePath);
        tryItArguments.addProperty("listener", listenerName);

        List<Object> commandArgs = Arrays.asList(
                false,
                null,
                tryItArguments,
                context.fileUri()
        );

        Command command = new Command(CodeLensUtil.TRY_IT_CODELENS, TRY_IT_COMMAND, commandArgs);
        return CodeLensUtil.getCodeLens(command, node);
    }

    private TypeSymbol getListenerTypeSymbol(TypeSymbol typeSymbol, SemanticModel semanticModel) {
        if (typeSymbol.typeKind() == TypeDescKind.UNION) {
            UnionTypeSymbol unionTypeSymbol = (UnionTypeSymbol) typeSymbol;
            return unionTypeSymbol.memberTypeDescriptors().stream()
                    .filter(member -> !member.subtypeOf(semanticModel.types().ERROR))
                    .findFirst().orElse(null);
        }
        return typeSymbol;
    }

    private static String getPathString(NodeList<Node> nodes) {
        if (nodes.isEmpty()) {
            return "/";
        }
        return nodes.stream()
                .map(node -> node.toString().trim())
                .collect(Collectors.joining());
    }

    /**
     * Extracts and transforms a listener type signature from the format {@code <org>/<module>:<version>:TypeName} to
     * {@code module:TypeName}.
     * <p>
     * For example:
     * <ul>
     *   <li>{@code foo/bar:1.0.0:Listener} → {@code bar:Listener}</li>
     *   <li>{@code Listener} → {@code Listener}</li>
     * </ul>
     *
     * @param signature the listener type signature string
     * @return the formatted signature
     */
    private static String extractListenerName(String signature) {
        if (!signature.contains(":")) {
            return signature;
        }

        String[] parts = signature.split(":");
        if (parts.length < 2) {
            return signature;
        }

        String typeName = parts[parts.length - 1];

        if (parts.length >= 3) {
            String moduleWithOrg = parts[0];
            if (moduleWithOrg.contains("/")) {
                String module = moduleWithOrg.substring(moduleWithOrg.lastIndexOf("/") + 1);
                return module + ":" + typeName;
            }
        }

        return typeName;
    }

    /**
     * Creates the set of supported modules. Includes "module1" only when running in tests. This is computed once during
     * class loading.
     *
     * @return set of supported module names
     */
    private static Set<String> createSupportedModules() {
        // Detects if the code is currently running in a test environment by checking system property.
        if ("true".equals(System.getProperty(TRY_IT_TEST_KEY))) {
            return Set.of("module1");
        }
        return Set.of("http", "graphql", "ai");
    }
}
