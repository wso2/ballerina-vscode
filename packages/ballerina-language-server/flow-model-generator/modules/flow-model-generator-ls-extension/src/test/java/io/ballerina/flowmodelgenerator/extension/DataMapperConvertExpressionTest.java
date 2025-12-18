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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonElement;
import io.ballerina.flowmodelgenerator.extension.request.DataMapperConvertRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.ballerinalang.langserver.BallerinaLanguageServer;
import org.ballerinalang.langserver.util.TestUtil;
import org.eclipse.lsp4j.jsonrpc.Endpoint;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for the convertExpression API that converts expressions between incompatible primitive types.
 *
 * @since 1.6.0
 */
public class DataMapperConvertExpressionTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("int_to_string.json")},
                {Path.of("float_to_string.json")},
                {Path.of("decimal_to_string.json")},
                {Path.of("boolean_to_string.json")},
                {Path.of("float_to_int.json")},
                {Path.of("decimal_to_int.json")},
                {Path.of("int_to_decimal.json")},
                {Path.of("float_to_decimal.json")},
                {Path.of("int_to_float.json")},
                {Path.of("decimal_to_float.json")},
                {Path.of("string_to_int.json")},
                {Path.of("string_to_float.json")},
                {Path.of("string_to_decimal.json")},
                {Path.of("byte_to_decimal.json")},
                {Path.of("byte_to_float.json")},
                {Path.of("byte_to_int.json")},
                {Path.of("byte_to_string.json")},
                {Path.of("decimal_to_byte.json")},
                {Path.of("float_to_byte.json")},
                {Path.of("int_to_byte.json")},
        };
    }

    @Test(dataProvider = "data-provider")
    @Override
    public void test(Path config) throws IOException {
        Endpoint endpoint = TestUtil.newLanguageServer().withLanguageServer(new BallerinaLanguageServer()).build();
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        DataMapperConvertRequest request = new DataMapperConvertRequest(
                testConfig.output(),
                testConfig.outputType(),
                testConfig.expression(),
                testConfig.expressionType()
        );

        JsonElement response = getResponse(endpoint, request);
        String actualConverted = response.getAsJsonObject().get("convertedExpression").getAsString();
        String expectedConverted = testConfig.convertedExpression();

        // Check if converted expression matches
        if (!actualConverted.equals(expectedConverted)) {
            TestConfig updateConfig = new TestConfig(
                    testConfig.description(),
                    testConfig.output(),
                    testConfig.outputType(),
                    testConfig.expression(),
                    testConfig.expressionType(),
                    actualConverted
            );
//            updateConfig(configJsonPath, updateConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)%nExpected: %s%nActual: %s",
                    testConfig.description(), configJsonPath, expectedConverted, actualConverted));
        }
    }

    @Override
    protected String getResourceDir() {
        return "convert_expression";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return DataMapperConvertExpressionTest.class;
    }

    @Override
    protected String getApiName() {
        return "convertExpression";
    }

    @Override
    protected String getServiceName() {
        return "dataMapper";
    }

    /**
     * Represents the test configuration for the convert expression test.
     *
     * @param description         The description of the test
     * @param output              The target field path
     * @param outputType          The target type
     * @param expression          The source expression
     * @param expressionType      The source type
     * @param convertedExpression The expected converted expression
     */
    protected record TestConfig(String description, String output, String outputType, String expression,
                                String expressionType, String convertedExpression) {
    }
}
