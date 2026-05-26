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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import io.ballerina.flowmodelgenerator.core.expressioneditor.ExpressionEditorContext;
import io.ballerina.flowmodelgenerator.extension.request.ExpressionEditorDiagnosticsRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.eclipse.lsp4j.Diagnostic;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Tests to get the diagnostics for clause addition in data mapper.
 *
 * @since 2.0.0
 */
public class DataMappingClauseDiagnosticsTest extends AbstractLSTest {

    private static final Type diagnosticsType = new TypeToken<List<Diagnostic>>() { }.getType();

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("variable1.json")},
                {Path.of("variable2.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        String sourcePath = getSourcePath(testConfig.filePath());

        notifyDidOpen(sourcePath);
        ExpressionEditorDiagnosticsRequest request =
                new ExpressionEditorDiagnosticsRequest(sourcePath, testConfig.context());
        JsonObject response = getResponse(request);
        List<Diagnostic> actualDiagnostics = gson.fromJson(response.get("diagnostics").getAsJsonArray(),
                diagnosticsType);
        notifyDidClose(sourcePath);

        if (!assertArray("diagnostics", actualDiagnostics, testConfig.diagnostics())) {
            TestConfig updatedConfig = new TestConfig(testConfig.description(), testConfig.filePath(),
                    testConfig.context(), actualDiagnostics);
//             updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_clause_diagnostics";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingClauseDiagnosticsTest.class;
    }

    @Override
    protected String getApiName() {
        return "diagnostics";
    }

    @Override
    protected String getServiceName() {
        return "expressionEditor";
    }

    private record TestConfig(String description, String filePath, ExpressionEditorContext.Info context,
                              List<Diagnostic> diagnostics) {
    }
}
