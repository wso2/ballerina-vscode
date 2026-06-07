// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { LibraryMode, MinifiedLibrary } from "@wso2/ballerina-core";
import { langClient } from "../../activator";
import { getGenerationMode } from "../ai-utils";


// export async function getRelevantLibs(params: GenerateCodeParams): Promise<Library[]> {
//     // const prompt = getReadmeQuery(params);
//     const selectedLibs: string[] = await getSelectedLibraries(prompt);
//     return selectRequiredFunctions(prompt, selectedLibs)
// }

export enum GenerationType {
    CODE_GENERATION = "CODE_GENERATION",
    HEALTHCARE_GENERATION = "HEALTHCARE_GENERATION",
    ALL = "ALL"
}

export function getLibraryModeFromGenerationType(generationType: GenerationType): LibraryMode {
    switch (generationType) {
        case GenerationType.CODE_GENERATION:
            return "CORE";
        case GenerationType.HEALTHCARE_GENERATION:
            return "HEALTHCARE";
        case GenerationType.ALL:
        default:
            return "ALL";
    }
}

export async function getAllLibraries(generationType: GenerationType): Promise<MinifiedLibrary[]> {
    const result = (await langClient.getCopilotCompactLibraries({
        mode: getLibraryModeFromGenerationType(generationType),
    })) as { libraries: MinifiedLibrary[] };
    return result.libraries as MinifiedLibrary[];
}
