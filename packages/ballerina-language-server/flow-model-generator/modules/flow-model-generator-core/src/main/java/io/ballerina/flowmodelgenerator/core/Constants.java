/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core;

import java.util.List;

/**
 * Constants used in the flow model generator.
 *
 * @since 1.0.0
 */
public class Constants {

    // Check keywords
    public static final String CHECK = "check";
    public static final String CHECKPANIC = "checkpanic";

    public static final String MAIN_FUNCTION_NAME = "main";
    public static final String BALLERINA = "ballerina";
    public static final String BALLERINAX = "ballerinax";

    // AI related constants
    public static final String AI = "ai";
    public static final String DEFAULT_MODEL_PROVIDER = "getDefaultModelProvider";

    public static final String CONDITION_TYPE_CONSTRAINT = "boolean";
    public static final String MATCH_TARGET_TYPE_CONSTRAINT = "any|error";
    public static final String COLLECTION_TYPE_CONSTRAINT =
            "(any|error)[]|stream<any|error, ()>|string|map<any|error>|json";

    // Constants used for Natural functions
    public static final class NaturalFunctions {

        private NaturalFunctions() {
        }

        public static final String MODEL_PROVIDER = "modelProvider";
        public static final String MODEL_PROVIDER_LABEL = "Configure the model";
        public static final String MODEL_PROVIDER_DESCRIPTION = "The large language model (LLM) to use";

        // Model selection choices
        public static final String DEFAULT_MODEL_PROVIDER_WSO2 = "Default Model Provider (WSO2)";
        public static final String ACCEPT_AS_PARAMETER = "Accept as a parameter";

        public static final String MODEL_PROVIDER_AS_PARAMETER_KEY = "modelProviderAsParameter";

        public static final String PROMPT = "prompt";
        public static final String MODULE_PREFIXED_PROMPT_TYPE = "np:Prompt";
        public static final String PROMPT_LABEL = "Prompt";
        public static final String PROMPT_DESCRIPTION = "Prompt for the function";

        public static final String MODEL = "model";
        public static final String MODEL_TYPE_NAME = "ModelProvider";
        public static final String MODULE_PREFIXED_MODEL_PROVIDER_TYPE = "ai:ModelProvider";
        public static final String MODEL_LABEL = "Model";
        public static final String MODEL_DESCRIPTION = "Model for the function";

        public static final List<String> MODEL_PROVIDER_OPTIONS = List.of(
                NaturalFunctions.DEFAULT_MODEL_PROVIDER_WSO2,
                NaturalFunctions.ACCEPT_AS_PARAMETER
        );

        public static final String ENABLE_MODEL_CONTEXT = "enableModelContext";
        public static final String ENABLE_MODEL_CONTEXT_LABEL = "Enable model configuration";
        public static final String ENABLE_MODEL_CONTEXT_DESCRIPTION =
                "Allow specifying Large Language Model (LLM) choice";

        public static final String BALLERINAX_ORG = "ballerinax";
        public static final String BALLERINA_ORG = "ballerina";
        public static final String NP_PACKAGE = "np";
        public static final String AI_PACKAGE = "ai";
        public static final String NP_PACKAGE_WITH_ORG = BALLERINAX_ORG + "/" + NP_PACKAGE;

        public static final String ICON =
                "https://gist.github.com/user-attachments/assets/903c5c16-7d67-4af8-8113-ce7c59ccdaab";

    }

    // Constants used for AI
    public static final class Ai {

        private Ai() {
        }

        public static final String BALLERINA_ORG = "ballerina";
        public static final String AI_PACKAGE = "ai";

        public static final String RECURSIVE_DOCUMENT_CHUNKER_LABEL = "Recursive Document Chunker";
        public static final String AUGMENT_QUERY_LABEL = "Augment Query";

        public static final String VECTOR_KNOWLEDGE_BASE_TYPE_NAME = "VectorKnowledgeBase";
        public static final String AGENT_TYPE_NAME = "Agent";

        public static final String AGENT_RUN_METHOD_NAME = "run";
        public static final String AGENT_SYMBOL_NAME = "init";
        public static final String CHUNK_DOCUMENT_RECURSIVELY_METHOD_NAME = "chunkDocumentRecursively";
        public static final String AUGMENT_USER_QUERY_METHOD_NAME = "augmentUserQuery";

        public static final String MODEL_PROVIDER_TYPE_NAME = "ModelProvider";
        public static final String EMBEDDING_PROVIDER_TYPE_NAME = "EmbeddingProvider";
        public static final String VECTOR_STORE_TYPE_NAME = "VectorStore";
        public static final String CHUNKER_TYPE_NAME = "Chunker";
        public static final String DATA_LOADER_TYPE_NAME = "DataLoader";
        public static final String WSO2_MODEL_PROVIDER_NAME = "Wso2ModelProvider";
        public static final String WSO2_EMBEDDING_PROVIDER_NAME = "Wso2EmbeddingProvider";
        public static final String GET_DEFAULT_MODEL_PROVIDER_METHOD = "getDefaultModelProvider";
        public static final String GET_DEFAULT_EMBEDDING_PROVIDER_METHOD = "getDefaultEmbeddingProvider";
        public static final String OPEN_AI_PROVIDER = "OpenAiProvider";

        public static final String AGENT_CODEDATA = "agentCodedata";
    }
}
