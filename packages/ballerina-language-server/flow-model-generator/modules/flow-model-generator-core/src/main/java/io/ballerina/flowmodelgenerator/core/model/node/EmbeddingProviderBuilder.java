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

package io.ballerina.flowmodelgenerator.core.model.node;

import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.NodeKind;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.FunctionDataBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;
import io.ballerina.projects.Package;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static io.ballerina.modelgenerator.commons.FunctionDataBuilder.GET_DEFAULT_EMBEDDING_PROVIDER_FUNCTION_NAME;

/**
 * Represents embedding provider node in the flow model.
 *
 * @since 1.1.0
 */
public class EmbeddingProviderBuilder extends CallBuilder {
    public static final String LABEL = "Embedding Provider";
    public static final String DESCRIPTION = "Embedding providers available in the integration for connecting" +
            " to an embedding model";

    private static final String EMBEDDING_PROVIDER_NAME_LABEL = "Embedding Provider Name";
    private static final String EMBEDDING_PROVIDER_NAME_LABEL_DOC = "Name of the embedding-provider connection";
    private static final String CHECK_ERROR_DOC = "Terminate on error";

    @Override
    public void setConcreteConstData() {
        metadata().label(LABEL);
        codedata().node(NodeKind.EMBEDDING_PROVIDER);
    }

    @Override
    protected NodeKind getFunctionNodeKind() {
        return NodeKind.EMBEDDING_PROVIDER;
    }

    @Override
    protected FunctionData.Kind getFunctionResultKind() {
        return FunctionData.Kind.EMBEDDING_PROVIDER;
    }

    @Override
    public Map<Path, List<TextEdit>> toSource(SourceBuilder sourceBuilder) {
        sourceBuilder.token().keyword(SyntaxKind.FINAL_KEYWORD).stepOut().newVariable();
        sourceBuilder.token().keyword(SyntaxKind.CHECK_KEYWORD);
        if (GET_DEFAULT_EMBEDDING_PROVIDER_FUNCTION_NAME.equals(sourceBuilder.flowNode.codedata().symbol())) {
            sourceBuilder.token().name(methodCallWithModulePrefix(sourceBuilder));
        } else {
            sourceBuilder.token().keyword(SyntaxKind.NEW_KEYWORD);
        }
        sourceBuilder.functionParameters(sourceBuilder.flowNode,
                Set.of(Property.VARIABLE_KEY, Property.TYPE_KEY, Property.SCOPE_KEY, Property.CHECK_ERROR_KEY));
        sourceBuilder.textEdit();
        sourceBuilder.acceptImport();
        return sourceBuilder.build();
    }

    private static String methodCallWithModulePrefix(SourceBuilder sourceBuilder) {
        String module = sourceBuilder.flowNode.codedata().module();
        String methodCallPrefix = (module != null) ? module.substring(module.lastIndexOf('.') + 1) + ":" : "";
        return methodCallPrefix + GET_DEFAULT_EMBEDDING_PROVIDER_FUNCTION_NAME;
    }

    @Override
    public void setConcreteTemplateData(NodeBuilder.TemplateContext context) {
        Codedata codedata = context.codedata();
        ModuleInfo codedataModuleInfo = new ModuleInfo(codedata.org(), codedata.packageName(),
                codedata.module(), codedata.version());

        // Create and set the resolved package for the function
        Optional<Package> resolvedPackage = PackageUtil.resolveModulePackage(
                codedata.org(), codedata.packageName(), codedata.version());

        FunctionData functionData = new FunctionDataBuilder().moduleInfo(codedataModuleInfo).userModuleInfo(moduleInfo)
                .parentSymbolType(codedata.object()).name(codedata.symbol())
                .resolvedPackage(resolvedPackage.orElse(null))
                .lsClientLogger(context.lsClientLogger()).functionResultKind(FunctionData.Kind.EMBEDDING_PROVIDER)
                .build();

        metadata().label(functionData.packageName()).description(functionData.description())
                .icon(CommonUtils.generateIcon(functionData.org(), functionData.packageName(), functionData.version()));

        codedata().node(NodeKind.EMBEDDING_PROVIDER)
                .org(functionData.org()).module(functionData.moduleName())
                .packageName(functionData.packageName()).version(functionData.version())
                .symbol(codedata.symbol());

        if (!GET_DEFAULT_EMBEDDING_PROVIDER_FUNCTION_NAME.equals(functionData.name())) {
            codedata().object(functionData.name());
        }

        if (CommonUtils.hasReturn(functionData.returnType())) {
            setReturnTypeProperties(functionData, context, EMBEDDING_PROVIDER_NAME_LABEL,
                    EMBEDDING_PROVIDER_NAME_LABEL_DOC, false);
        }
        setParameterProperties(functionData);
        properties().scope(Property.GLOBAL_SCOPE).checkError(true, CHECK_ERROR_DOC, false);
    }
}
