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

package io.ballerina.servicemodelgenerator.extension.builder.service;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.servicemodelgenerator.extension.builder.ServiceBuilderRouter;
import io.ballerina.servicemodelgenerator.extension.model.Codedata;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Service;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.servicemodelgenerator.extension.util.Constants;
import io.ballerina.servicemodelgenerator.extension.util.Utils;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.builder.FunctionBuilderRouter.getFunctionFromSource;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.GRAPHQL;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getFunction;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getServiceTypeIdentifier;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.updateFunction;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.updateListenerItems;
import static io.ballerina.servicemodelgenerator.extension.util.ServiceModelUtils.getReadonlyMetadata;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.isPresent;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.populateListenerInfo;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateAnnotationAttachmentProperty;
import static io.ballerina.servicemodelgenerator.extension.util.Utils.updateServiceDocs;

/**
 * Builder class for GraphQL service.
 *
 * @since 1.2.0
 */
public class GraphqlServiceBuilder extends AbstractServiceBuilder {

    @Override
    public Service getModelFromSource(ModelFromSourceContext context) {
        if (Objects.isNull(context.moduleName())) {
            return null;
        }
        String serviceType = getServiceTypeIdentifier(context.serviceType());
        Optional<Service> service = ServiceBuilderRouter.getModelTemplate(context.orgName(), context.moduleName());
        if (service.isEmpty()) {
            return null;
        }
        Service serviceModel = service.get();
        int packageId = Integer.parseInt(serviceModel.getId());
        ServiceDatabaseManager.getInstance().getMatchingServiceTypeFunctions(packageId, serviceType)
                .forEach(function -> serviceModel.getFunctions().add(getFunction(function)));
        serviceModel.getServiceType().setValue(serviceType);

        ServiceDeclarationNode serviceNode = (ServiceDeclarationNode) context.node();
        extractServicePathInfo(serviceNode, serviceModel);
        List<Function> functionsInSource = serviceNode.members().stream()
                .filter(member -> member instanceof FunctionDefinitionNode)
                .map(member -> getFunctionFromSource(context.moduleName(), context.semanticModel(), member))
                .toList();

        updateGraphqlServiceInfo(serviceModel, functionsInSource);
        serviceModel.setCodedata(new Codedata(serviceNode.lineRange(), serviceModel.getModuleName(),
                serviceModel.getOrgName()));
        populateListenerInfo(serviceModel, serviceNode);
        updateServiceDocs(serviceNode, serviceModel);
        updateAnnotationAttachmentProperty(serviceNode, serviceModel);
        updateListenerItems(context.moduleName(), context.semanticModel(), context.project(), serviceModel);

        // Initialize readOnly metadata if not present in template (GraphqlServiceBuilder uses custom template)
        if (serviceModel.getProperty("readOnlyMetaData") == null) {
            String modelServiceType = serviceModel.getType();
            Value readOnlyMetadata = getReadonlyMetadata(serviceModel.getOrgName(), serviceModel.getPackageName(), modelServiceType);
            serviceModel.getProperties().put("readOnlyMetaData", readOnlyMetadata);
        }

        // Add readOnly metadata extraction (same logic as parent class)
        updateReadOnlyMetadataWithAnnotations(serviceModel, serviceNode, context);

        return serviceModel;
    }

    @Override
    public String kind() {
        return GRAPHQL;
    }

    public static void updateGraphqlServiceInfo(Service serviceModel, List<Function> functionsInSource) {
        Utils.populateRequiredFunctions(serviceModel);

        // mark the enabled functions as true if they present in the source
        serviceModel.getFunctions().forEach(functionModel -> {
            Optional<Function> function = functionsInSource.stream()
                    .filter(newFunction -> isPresent(functionModel, newFunction)
                            && newFunction.getKind().equals(functionModel.getKind()))
                    .findFirst();
            functionModel.setEditable(false);
            function.ifPresentOrElse(
                    func -> updateFunction(functionModel, func, serviceModel),
                    () -> functionModel.setEnabled(false));
        });

        functionsInSource.forEach(funcInSource -> {
            if (serviceModel.getFunctions().stream().noneMatch(newFunction -> isPresent(funcInSource, newFunction))) {
                updateGraphqlFunctionMetaData(funcInSource);
                serviceModel.addFunction(funcInSource);
            }
        });
    }

    public static void updateGraphqlFunctionMetaData(Function function) {
        switch (function.getKind()) {
            case Constants.KIND_QUERY -> {
                function.setMetadata(new MetaData("Graphql Query", "Graphql Query"));
                function.getName().setMetadata(new MetaData("Field Name", "The name of the field"));
            }
            case Constants.KIND_MUTATION -> {
                function.setMetadata(new MetaData("Graphql Mutation", "Graphql Mutation"));
                function.getName().setMetadata(new MetaData("Mutation Name", "The name of the mutation"));
            }
            case Constants.KIND_SUBSCRIPTION -> {
                function.setMetadata(new MetaData("Graphql Subscription", "Graphql Subscription"));
                function.getName().setMetadata(
                        new MetaData("Subscription Name", "The name of the subscription"));
            }
            default -> { }
        }
    }
}
