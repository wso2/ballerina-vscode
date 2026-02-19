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

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import io.ballerina.flowmodelgenerator.extension.request.GetAllLibrariesRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import org.testng.Assert;
import org.testng.annotations.DataProvider;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Tests for the Copilot Library Service getLibrariesListFromSearchIndex method.
 *
 * @since 1.7.0
 */
public class GetLibrariesListFromSearchIndex extends AbstractLSTest {

    @DataProvider(name = "data-provider")
    @Override
    protected Object[] getConfigsList() {
        return new Object[][]{
                {Path.of("get_libraries_list_from_database.json")},
        };
    }

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        GetAllLibrariesRequest request = new GetAllLibrariesRequest("ALL");
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
        return GetLibrariesListFromSearchIndex.class;
    }

    @Override
    protected String getApiName() {
        return "getLibrariesList";
    }

    @Override
    protected String getServiceName() {
        return "copilotLibraryManager";
    }
}
