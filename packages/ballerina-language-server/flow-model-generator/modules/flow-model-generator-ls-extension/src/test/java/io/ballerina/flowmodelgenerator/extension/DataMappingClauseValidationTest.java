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

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import io.ballerina.flowmodelgenerator.core.model.Diagnostics;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperClauseDiagnosticsRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests to get the diagnostics for clause addition in data mapper.
 *
 * @since 2.0.0
 */
public class DataMappingClauseValidationTest extends AbstractLSTest {

    private static final Type diagnosticsType = new TypeToken<Diagnostics>() {
    }.getType();

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

        DataMapperClauseDiagnosticsRequest request = new DataMapperClauseDiagnosticsRequest(
                sourceDir.resolve(testConfig.source()).toAbsolutePath().toString(), testConfig.codedata(),
                testConfig.index(), testConfig.clause(), testConfig.targetField());
        JsonObject response = getResponse(request);
        Diagnostics actualDiagnostics = gson.fromJson(response.get("diagnostics"), diagnosticsType);

        if (!actualDiagnostics.equals(testConfig.diagnostics())) {
            TestConfig updatedConfig = new TestConfig(testConfig.source(), testConfig.description(),
                    testConfig.codedata(), testConfig.index(), testConfig.clause(), testConfig.targetField(),
                    actualDiagnostics);
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "data_mapper_clause_validation";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMappingClauseValidationTest.class;
    }

    @Override
    protected String getApiName() {
        return "clauseDiagnostics";
    }

    @Override
    protected String getServiceName() {
        return "dataMapper";
    }

    /**
     * Represents the test configuration for the clause diagnostics validation test.
     *
     * @param source      The source file name
     * @param description The description of the test
     * @param codedata    The Details of the node
     * @param index       The index of the clause in the query expression
     * @param clause      The clause to add
     * @param targetField The target field to consider when validating the clause
     * @param diagnostics The expected diagnostics
     */
    private record TestConfig(String source, String description, JsonElement codedata, int index,
                              JsonElement clause, String targetField, Diagnostics diagnostics) {

        public String description() {
            return description == null ? "" : description;
        }
    }
}
