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

package io.ballerina.servicemodelgenerator.extension.builder;

import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import org.eclipse.lsp4j.TextEdit;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Interface for building service models and function models.
 * This interface defines methods to get model templates, add, update, and extract models from source code.
 *
 * @param <T> the type of the model being built
 */
public interface NodeBuilder<T> {

    /**
     * Get the model template for the given service type or function type.
     *
     * @return the model template
     */
    Optional<T> getModelTemplate(GetModelContext context);

    /**
     * Get the list of text edits for the given model for addition.
     *
     * @param context the context information for adding the service
     * @return a map of file paths to lists of text edits
     */
    Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception;

    /**
     * Get the list of text edits for the given ser for updating.
     *
     * @param context the context information for updating the service
     * @return a map of file paths to lists of text edits
     */
    Map<String, List<TextEdit>> updateModel(UpdateModelContext context);

    /**
     * Get the service from the source code.
     *
     * @param context the context information for extracting the ser
     * @return the service extracted from the source code
     */
    T getModelFromSource(ModelFromSourceContext context);

    String kind();
}
