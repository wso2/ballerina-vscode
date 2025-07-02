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

package io.ballerina.flowmodelgenerator.extension.typesmanager;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import io.ballerina.flowmodelgenerator.extension.request.JsonToTypeRequest;
import io.ballerina.flowmodelgenerator.extension.request.TypeUpdateRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.eclipse.lsp4j.TextEdit;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Test cases for converting JSON to Ballerina types.
 *
 * @since 1.0.0
 */
public class JsonToTypeTest extends AbstractLSTest {
    private static final Type textEditListType = new TypeToken<Map<String, List<TextEdit>>>() {
    }.getType();

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        String sourceFile = sourceDir.resolve(testConfig.filePath()).toAbsolutePath().toString();
        JsonToTypeRequest request = new JsonToTypeRequest(
                testConfig.jsonString(),
                testConfig.typeName(),
                testConfig.prefix(),
                testConfig.allowAdditionalFields(),
                testConfig.asInline(),
                testConfig.isNullAsOptional(), // nullAsOptional is not used in this context
                sourceFile);
        JsonArray types = getResponse(request).getAsJsonArray("types");

        StringBuilder sb = new StringBuilder();
        for (JsonElement record : types) {
            TypeUpdateRequest updateRequest =
                    new TypeUpdateRequest(sourceFile, ((JsonObject) record).get("type"));
            JsonElement response = getResponse(updateRequest, "typesManager/updateType").getAsJsonObject("textEdits");
            Map<String, List<TextEdit>> actualTextEdits = gson.fromJson(response, textEditListType);
            for (Map.Entry<String, List<TextEdit>> entry : actualTextEdits.entrySet()) {
                for (TextEdit textEdit : entry.getValue()) {
                    sb.append(textEdit.getNewText()).append(System.lineSeparator());
                }
            }
        }

        String generatedRecords = sb.toString().replaceAll("\\s+", "");
        String expectedRecords = testConfig.expectedTypes().replaceAll("\\s+", "");

        if (!generatedRecords.equals(expectedRecords)) {
            TestConfig updatedConfig = new TestConfig(
                    testConfig.description(), testConfig.filePath(), testConfig.jsonString(), testConfig.typeName(),
                    testConfig.prefix(), testConfig.isNullAsOptional(), testConfig.allowAdditionalFields(),
                    testConfig.asInline(), sb.toString()
            );
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)", testConfig.filePath(), configJsonPath));
        }
    }

    @Override
    protected String getResourceDir() {
        return "json_to_type";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return JsonToTypeTest.class;
    }

    @Override
    protected String getApiName() {
        return "jsonToType";
    }

    @Override
    protected String getServiceName() {
        return "typesManager";
    }

    private record TestConfig(String description, String filePath, String jsonString,
                              String typeName, String prefix, boolean isNullAsOptional,  boolean allowAdditionalFields,
                              boolean asInline,
                              String expectedTypes) {
    }
}
