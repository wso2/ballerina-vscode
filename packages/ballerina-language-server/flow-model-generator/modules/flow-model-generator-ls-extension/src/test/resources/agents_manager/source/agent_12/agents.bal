// Copyright (c) 2025 WSO2 LLC (http://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import ballerina/ai;

final ai:Wso2ModelProvider myModel = check ai:getDefaultModelProvider();

final ai:Agent originalAgent = check new (
    model = myModel,
    systemPrompt = {role: string `Assistant`, instructions: string `Help users with weather and time queries.`}
);

// Variable reassignment in a function (local scope)
public function main() returns error? {
    ai:Agent reassignedAgent = originalAgent;
    string result1 = check reassignedAgent.run("What's the weather in London?");
}
