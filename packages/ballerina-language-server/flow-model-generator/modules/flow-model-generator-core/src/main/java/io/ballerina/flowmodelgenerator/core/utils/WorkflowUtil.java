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

package io.ballerina.flowmodelgenerator.core.utils;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.AnnotationAttachmentSymbol;
import io.ballerina.compiler.api.symbols.AnnotationSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.SyntaxKind;

import java.util.List;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ACTIVITY_ANNOTATION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.PROCESS_ANNOTATION;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Utility for workflow related operations.
 *
 * @since 2.0.0
 */
public class WorkflowUtil {
    public static boolean isWorkflowModule(Optional<ModuleSymbol> moduleSymbol) {
        if (moduleSymbol.isEmpty()) {
            return false;
        }
        String moduleName = moduleSymbol.get().id().moduleName();
        String orgName = moduleSymbol.get().id().orgName();
        return WORKFLOW_ORG.equals(orgName) && WORKFLOW_MODULE.equals(moduleName);
    }

    /**
     * Checks if the given function symbol has the @workflow:Process annotation.
     *
     * @param symbol The function symbol to check
     * @return true if the function has @workflow:Process annotation, false otherwise
     */
    public static boolean isWorkflowFunction(Symbol symbol) {
        if ((symbol instanceof FunctionSymbol funcSymbol)) {
            List<AnnotationAttachmentSymbol> annotations = funcSymbol.annotAttachments();
            for (AnnotationAttachmentSymbol attachment : annotations) {
                AnnotationSymbol annotation = attachment.typeDescriptor();
                Optional<String> annotationName = annotation.getName();
                Optional<ModuleSymbol> moduleSymbol = annotation.getModule();

                if (annotationName.isPresent() && moduleSymbol.isPresent()) {
                    String name = annotationName.get();
                    if (PROCESS_ANNOTATION.equals(name) && isWorkflowModule(moduleSymbol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public static boolean isInsideWorkflowProcessFunction(SemanticModel semanticModel, Node node) {
        Node parent = node;
        while (parent != null) {
            if (parent.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                return isWorkflowFunction(semanticModel.symbol(parent).orElse(null));
            }
            parent = parent.parent();
        }
        return false;
    }

    /**
     * Checks if the given function symbol has the @workflow:Activity annotation.
     *
     * @param funcSymbol The function symbol to check
     * @return true if the function has @workflow:Activity annotation, false otherwise
     */
    public static boolean isActivityFunction(FunctionSymbol funcSymbol) {
        List<AnnotationAttachmentSymbol> annotations = funcSymbol.annotAttachments();
        for (AnnotationAttachmentSymbol attachment : annotations) {
            AnnotationSymbol annotation = attachment.typeDescriptor();
            Optional<String> annotationName = annotation.getName();
            Optional<ModuleSymbol> moduleSymbol = annotation.getModule();

            if (annotationName.isPresent() && moduleSymbol.isPresent()) {
                String name = annotationName.get();
                if (ACTIVITY_ANNOTATION.equals(name) && isWorkflowModule(moduleSymbol)) {
                    return true;
                }
            }
        }
        return false;
    }
}
