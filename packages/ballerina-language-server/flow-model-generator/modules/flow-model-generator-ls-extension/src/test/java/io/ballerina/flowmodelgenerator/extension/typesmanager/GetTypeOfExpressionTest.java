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

package io.ballerina.flowmodelgenerator.extension.typesmanager;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.extension.request.TypeOfExpressionRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.tools.text.LinePosition;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Test cases for retrieving type of the expression.
 *
 * @since 1.7.0
 */
public class GetTypeOfExpressionTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_type1.json")},
                {Path.of("get_type2.json")},
                {Path.of("get_type3.json")},
                {Path.of("get_type4.json")},
                {Path.of("get_type5.json")}
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);
        TypeOfExpressionRequest request = new TypeOfExpressionRequest(
                sourceDir.resolve(testConfig.filePath()).toAbsolutePath().toString(),
                testConfig.position(), testConfig.expression());
        JsonObject response = getResponse(request).getAsJsonObject("type");
        if (!response.equals(testConfig.type())) {
            TestConfig updateConfig = new TestConfig(testConfig.filePath(), testConfig.position(),
                    testConfig.expression(), testConfig.description(), response);
//            updateConfig(configJsonPath, updateConfig);
            compareJsonElements(response, testConfig.type());
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.description(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "types_manager/get_type_of_expression";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return GetTypeOfExpressionTest.class;
    }

    @Override
    protected String getApiName() {
        return "getTypeOfExpression";
    }

    @Override
    protected String getServiceName() {
        return "typesManager";
    }

    private record TestConfig(String filePath,
                              LinePosition position,
                              String expression,
                              String description,
                              JsonElement type) {
    }
}
