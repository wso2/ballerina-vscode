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

import io.ballerina.flowmodelgenerator.core.CopilotLibraryManager;
import io.ballerina.flowmodelgenerator.core.model.Client;
import io.ballerina.flowmodelgenerator.core.model.Library;
import io.ballerina.flowmodelgenerator.core.model.LibraryFunction;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.ArrayList;
import java.util.List;

/**
 * Tests for the applyLibraryExclusions functionality in CopilotLibraryManager.
 *
 * @since 1.0.1
 */
public class CopilotLibraryExclusionTest {

    private CopilotLibraryManager manager;

    @BeforeClass
    public void setUp() {
        manager = new CopilotLibraryManager();
    }

    @Test
    public void testExcludeClientFunctions() {
        List<Library> libraries = buildLibWithClient("ballerinax/slack", "Client",
                new String[]{"init", "getConversationMembers", "getConversationList", "postMessage"});

        manager.applyLibraryExclusions(libraries);

        List<LibraryFunction> funcs = libraries.get(0).getClients().get(0).getFunctions();
        Assert.assertEquals(funcs.size(), 2, "Should exclude 2 client functions");
    }

    @Test
    public void testExcludeModuleFunctions() {
        List<Library> libraries = buildLibWithFunctions("ballerina/io",
                new String[]{"print", "println", "fileReadBytes", "fileReadString"});

        manager.applyLibraryExclusions(libraries);

        List<LibraryFunction> funcs = libraries.get(0).getFunctions();
        Assert.assertEquals(funcs.size(), 2, "Should exclude print and println");
    }

    @Test
    public void testNoExclusionForUnlistedLibrary() {
        List<Library> libraries = buildLibWithFunctions("ballerina/http",
                new String[]{"createClient", "send"});

        manager.applyLibraryExclusions(libraries);

        List<LibraryFunction> funcs = libraries.get(0).getFunctions();
        Assert.assertEquals(funcs.size(), 2, "Unlisted library should be untouched");
    }

    @Test
    public void testWithAndWithoutExclusion() {
        List<Library> with = buildLibWithClient("ballerinax/slack", "Client",
                new String[]{"init", "getConversationMembers", "getConversationList", "postMessage"});
        List<Library> without = buildLibWithClient("ballerinax/slack", "Client",
                new String[]{"init", "getConversationMembers", "getConversationList", "postMessage"});

        manager.applyLibraryExclusions(with);

        Assert.assertEquals(without.get(0).getClients().get(0).getFunctions().size(), 4);
        Assert.assertEquals(with.get(0).getClients().get(0).getFunctions().size(), 2);
    }

    private List<Library> buildLibWithClient(String libName, String clientName, String[] funcNames) {
        List<Library> libraries = new ArrayList<>();
        Library lib = new Library(libName, "");
        Client client = new Client(clientName, "");
        List<LibraryFunction> functions = new ArrayList<>();
        for (String name : funcNames) {
            LibraryFunction f = new LibraryFunction();
            f.setName(name);
            functions.add(f);
        }
        client.setFunctions(functions);
        lib.setClients(List.of(client));
        lib.setFunctions(new ArrayList<>());
        libraries.add(lib);
        return libraries;
    }

    private List<Library> buildLibWithFunctions(String libName, String[] funcNames) {
        List<Library> libraries = new ArrayList<>();
        Library lib = new Library(libName, "");
        List<LibraryFunction> functions = new ArrayList<>();
        for (String name : funcNames) {
            LibraryFunction f = new LibraryFunction();
            f.setName(name);
            functions.add(f);
        }
        lib.setFunctions(functions);
        lib.setClients(new ArrayList<>());
        libraries.add(lib);
        return libraries;
    }
}
