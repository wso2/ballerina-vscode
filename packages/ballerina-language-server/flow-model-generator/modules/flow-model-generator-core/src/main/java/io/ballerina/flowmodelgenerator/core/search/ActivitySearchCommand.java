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

package io.ballerina.flowmodelgenerator.core.search;

import io.ballerina.compiler.api.symbols.AnnotationAttachmentSymbol;
import io.ballerina.compiler.api.symbols.AnnotationSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.flowmodelgenerator.core.model.AvailableNode;
import io.ballerina.flowmodelgenerator.core.model.Category;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.Item;
import io.ballerina.flowmodelgenerator.core.model.Metadata;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.modelgenerator.commons.SearchResult;
import io.ballerina.projects.Package;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LineRange;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ACTIVITY_ANNOTATION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Represents a command to search for workflow activity functions within a project.
 * This class extends SearchCommand and provides functionality to search for functions
 * annotated with @workflow:Activity.
 *
 * <p>The search results include activity functions from the current project that can be
 * called using ctx->callActivity().</p>
 *
 * @see SearchCommand
 * @since 2.0.0
 */
class ActivitySearchCommand extends SearchCommand {

    public ActivitySearchCommand(Project project, LineRange position, Map<String, String> queryMap) {
        super(project, position, queryMap);
    }

    @Override
    protected List<Item> defaultView() {
        buildActivityNodes();
        return rootBuilder.build().items();
    }

    @Override
    protected List<Item> search() {
        buildActivityNodes();
        return rootBuilder.build().items();
    }

    @Override
    protected Map<String, List<SearchResult>> fetchPopularItems() {
        return Map.of();
    }

    /**
     * Builds the list of activity functions from the current project.
     */
    private void buildActivityNodes() {
        Package currentPackage = project.currentPackage();
        PackageUtil.getCompilation(currentPackage);

        // Get the module information
        String orgName = currentPackage.packageOrg().value();
        String moduleName = currentPackage.packageName().value();
        String version = currentPackage.packageVersion().value().toString();

        // Create the category for current integration activities
        Category.Builder activityCategory = rootBuilder.stepIn(Category.Name.CURRENT_ACTIVITIES);

        // Search for functions with @workflow:Activity annotation in all modules
        currentPackage.modules().forEach(module -> {
            module.getCompilation().getSemanticModel().moduleSymbols().stream()
                    .filter(symbol -> symbol.kind() == SymbolKind.FUNCTION)
                    .map(symbol -> (FunctionSymbol) symbol)
                    .filter(this::hasActivityAnnotation)
                    .filter(funcSymbol -> matchesQuery(funcSymbol.getName().orElse("")))
                    .forEach(funcSymbol -> {
                        String funcName = funcSymbol.getName().orElse("");
                        String description = funcSymbol.documentation()
                                .flatMap(doc -> doc.description())
                                .orElse("Workflow activity function");

                        // Build the codedata with ACTIVITY_CALL node kind
                        Codedata codedata = new Codedata.Builder<>(null)
                                .node(NodeKind.ACTIVITY_CALL)
                                .org(orgName)
                                .module(moduleName)
                                .symbol(funcName)
                                .version(version)
                                .build();

                        Metadata metadata = new Metadata.Builder<>(null)
                                .label(funcName)
                                .description(description)
                                .build();

                        AvailableNode node = new AvailableNode(metadata, codedata, true);
                        activityCategory.node(node);
                    });
        });
    }

    /**
     * Checks if the given function symbol has the @workflow:Activity annotation.
     *
     * @param funcSymbol The function symbol to check
     * @return true if the function has @workflow:Activity annotation, false otherwise
     */
    private boolean hasActivityAnnotation(FunctionSymbol funcSymbol) {
        List<AnnotationAttachmentSymbol> annotations = funcSymbol.annotAttachments();
        for (AnnotationAttachmentSymbol attachment : annotations) {
            AnnotationSymbol annotation = attachment.typeDescriptor();
            Optional<String> annotationName = annotation.getName();
            Optional<ModuleSymbol> moduleSymbol = annotation.getModule();

            if (annotationName.isPresent() && moduleSymbol.isPresent()) {
                String name = annotationName.get();
                String moduleName = moduleSymbol.get().id().moduleName();
                String orgName = moduleSymbol.get().id().orgName();
                if (ACTIVITY_ANNOTATION.equals(name) && WORKFLOW_MODULE.equals(moduleName)
                        && WORKFLOW_ORG.equals(orgName)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Checks if the function name matches the search query.
     *
     * @param funcName The function name to check
     * @return true if it matches the query or query is empty, false otherwise
     */
    private boolean matchesQuery(String funcName) {
        if (query == null || query.isEmpty()) {
            return true;
        }
        return funcName.toLowerCase().contains(query.toLowerCase());
    }
}

