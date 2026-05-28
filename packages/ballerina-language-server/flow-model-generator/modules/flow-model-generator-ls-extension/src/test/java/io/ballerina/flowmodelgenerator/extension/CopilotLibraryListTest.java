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

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import io.ballerina.flowmodelgenerator.extension.request.GetAllLibrariesRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for the Copilot Library Service getLibrariesList method.
 *
 * @since 1.0.1
 */
public class CopilotLibraryListTest extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_libraries_list_from_database.json")},
//                {Path.of("get_libraries_list_healthcare.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        GetAllLibrariesRequest request = new GetAllLibrariesRequest(testConfig.mode());
        JsonElement response = getResponse(request);

        JsonArray actualLibraries = response.getAsJsonObject().getAsJsonArray("libraries");

        Assert.assertNotNull(actualLibraries, "No libraries array found in response");
        Assert.assertFalse(actualLibraries.isEmpty(), "Libraries array should not be empty");
    }

    @Override
    protected String getResourceDir() {
        return "copilot_library";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return CopilotLibraryListTest.class;
    }

    @Override
    protected String getApiName() {
        return "getLibrariesList";
    }

    @Override
    protected String getServiceName() {
        return "copilotLibraryManager";
    }

    private record TestConfig(String description, String mode) {

        public String mode() {
            return mode == null ? "CORE" : mode;
        }
    }
}
