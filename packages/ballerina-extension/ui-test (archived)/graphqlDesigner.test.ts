/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { before, describe } from "mocha";
import { join } from "path";
import { By, EditorView, VSBrowser, WebDriver, WebView } from "vscode-extension-tester";
import { GraphqlDesignerView } from "./utils/GraphqlDesignerView";
import { clickOnActivity, wait } from "./util";
import { EXPLORER_ACTIVITY } from "./constants";

describe('VSCode Graphql Designer Webview UI Tests', () => {
    const PROJECT_ROOT = join(__dirname, '..', '..', 'ui-test', 'data', 'starwars');
    const FILE_NAME = 'service.bal';
    let webview: WebView;
    let browser: VSBrowser;
    let driver: WebDriver;

    before(async () => {
        browser = VSBrowser.instance;
        driver = browser.driver;
        await new EditorView().closeAllEditors();
        await browser.openResources(PROJECT_ROOT, `${PROJECT_ROOT}/${FILE_NAME}`);
        await clickOnActivity(EXPLORER_ACTIVITY);
    });

    it('Verify nodes and fields in Graphql Visualizer', async () => {
        await GraphqlDesignerView.verifyGraphqlDesignerCanvasLoad(driver);

        // Verify root node
        await GraphqlDesignerView.verifyFieldsAndTypesInNode("graphql-root-node-/graphql2",
            [{ name: "function-card-hero", type: "resource-type-Character!" },
                { name: "function-card-reviews", type: "resource-type-[Review]!" },
                { name: "function-card-characters", type: "resource-type-[Character]!" },
                { name: "function-card-droid", type: "resource-type-Droid" },
                { name: "function-card-human", type: "resource-type-Human" },
                { name: "function-card-starship", type: "resource-type-Starship" },
                { name: "function-card-search", type: "resource-type-[SearchResult!]" },
                { name: "function-card-reviewAdded", type: "resource-type-Review!" },
                { name: "function-card-createReview", type: "remote-type-Review!" },
                { name: "function-card-profile", type: "resource-type-profile!" }
            ]);

        // Verify Record node
        await GraphqlDesignerView.verifyFieldsAndTypesInNode("record-node-Review",
            [{ name: "record-field-episode", type: "record-field-type-Episode!" },
                { name: "record-field-stars", type: "record-field-type-Int!" },
                { name: "record-field-commentary", type: "record-field-type-String" }]);

        // Verify Enum node
        await GraphqlDesignerView.verifyFieldsInNode("enum-node-Episode",
            ["enum-field-NEWHOPE", "enum-field-EMPIRE", "enum-field-JEDI"]);


        // Verify Service Class nodes
        await GraphqlDesignerView.verifyFieldsAndTypesInNode("service-class-node-Droid",
            [{ name: "service-field-card-name", type: "service-field-type-String!" },
                { name: "service-field-card-id", type: "service-field-type-String!" },
                { name: "service-field-card-friends", type: "service-field-type-[Character!]!" },
                { name: "service-field-card-appearsIn", type: "service-field-type-[Episode!]!" },
                { name: "service-field-card-primaryFunction", type: "service-field-type-String" },
            ]);

        await GraphqlDesignerView.verifyNodeHeader("service-class-head-Human");
        await GraphqlDesignerView.verifyNodeHeader("service-class-head-Starship");


        // Verify Interface nodes
        await GraphqlDesignerView.verifyFieldsAndTypesInNode("interface-node-Character",
            [{ name: "interface-func-field-id", type: "interface-func-type-String!" },
                { name: "interface-func-field-name", type: "interface-func-type-String!" },
                { name: "interface-func-field-friends", type: "interface-func-type-[Character!]!" },
                { name: "interface-func-field-appearsIn", type: "interface-func-type-[Episode!]!" },
            ]);

        await GraphqlDesignerView.verifyNodeHeader("interface-node-Human");
        await GraphqlDesignerView.verifyNodeHeader("interface-node-Droid");


        // Verify Union nodes
        await GraphqlDesignerView.verifyFieldsInNode("union-node-SearchResult",
            ["union-field-Human", "union-field-Droid", "union-field-Starship"]);


        // Verify Hierarchical nodes
        await GraphqlDesignerView.verifyFieldsAndTypesInNode("hierarchical-node-profile",
            [{ name: "hierarchical-field-card-quote", type: "hierarchical-field-type-String!" },
                { name: "hierarchical-field-card-name", type: "hierarchical-field-type-name!" },
            ]);

        await GraphqlDesignerView.verifyFieldsAndTypesInNode("hierarchical-node-name",
            [{ name: "hierarchical-field-card-first", type: "hierarchical-field-type-String!" },
                { name: "hierarchical-field-card-last", type: "hierarchical-field-type-String!" },
            ]);

        // Verify Links
        await GraphqlDesignerView.verifyLinks(["right-search-left-SearchResult",
            "right-hero-left-Character", "right-reviewAdded-left-Review", "right-starship-left-Starship",
            "right-human-left-Human", "right-appearsIn-left-Episode", "right-Starship-left-Starship"
        ]);
    });

    it('Verify filtering of operations', async () => {
        webview = new WebView();
        await GraphqlDesignerView.clickOperationFilterOption(webview, "Mutations");

        await GraphqlDesignerView.verifyFieldsInNode("graphql-root-node-/graphql2", ["remote-identifier-createReview"]);
        await GraphqlDesignerView.verifyNodeHeaderList(["record-head-Review", "enum-head-Episode"]);

        await GraphqlDesignerView.clickOperationFilterOption(webview, "Subscriptions");

        await GraphqlDesignerView.verifyFieldsInNode("graphql-root-node-/graphql2", ["resource-identifier-reviewAdded"]);
        await GraphqlDesignerView.verifyNodeHeaderList(["record-head-Review", "enum-head-Episode"]);
    });

    it('Verify filtering of nodes', async () => {
        await GraphqlDesignerView.selectNodeToFilter(webview, "/graphql2", "Human");

        await GraphqlDesignerView.verifyNodeHeaderList(["service-class-head-Human", "service-class-head-Droid",
            "interface-head-Character", "enum-head-Episode", "service-class-head-Starship"
        ]);

    });

    it('Verify subGraph filtering', async () => {
        await GraphqlDesignerView.selectNodeToFilter(webview, "Human", "/graphql2", true); 
        await GraphqlDesignerView.clickOperationFilterOption(webview, "All Operations");

        await GraphqlDesignerView.verifyNodeHeader("union-head-SearchResult");

        await GraphqlDesignerView.openNodeMenu(webview, "union-head-SearchResult", "filter-node-menu");
        await GraphqlDesignerView.openSubGraph(webview);

        await GraphqlDesignerView.verifyNodeHeaderList(["union-head-SearchResult", "service-class-head-Droid",
            "service-class-head-Human", "service-class-head-Starship", "interface-head-Character", "enum-head-Episode"
        ]);
    });
});
