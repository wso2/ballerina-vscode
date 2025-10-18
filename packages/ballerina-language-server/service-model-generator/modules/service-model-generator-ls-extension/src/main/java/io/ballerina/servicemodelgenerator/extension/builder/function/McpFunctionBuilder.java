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

package io.ballerina.servicemodelgenerator.extension.builder.function;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.MCP;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.NEW_LINE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.REMOTE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.SPACE;

public class McpFunctionBuilder extends AbstractFunctionBuilder {
    
    private static final String MCP_FUNCTION_MODEL_LOCATION = "functions/mcp_tool.json";
    private static final String TOOL_DESCRIPTION_PROPERTY = "toolDescription";
    
    @Override
    public Optional<Function> getModelTemplate(GetModelContext context) {
        return getMcpFunctionModel();
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
        Map<String, List<TextEdit>> textEdits = super.addModel(context);
        
        String toolDescription = context.function().getProperties().containsKey(TOOL_DESCRIPTION_PROPERTY) 
            ? context.function().getProperties().get(TOOL_DESCRIPTION_PROPERTY).getValue() 
            : null;
        
        if (toolDescription == null || toolDescription.trim().isEmpty()) {
            return textEdits;
        }
        
        return addMcpToolAnnotation(textEdits, context.function().getName().getValue(), toolDescription);
    }

    @Override
    public String kind() {
        return MCP;
    }
    
    private static Optional<Function> getMcpFunctionModel() {
        InputStream resourceStream = Utils.class.getClassLoader()
                .getResourceAsStream(MCP_FUNCTION_MODEL_LOCATION);
        if (resourceStream == null) {
            return Optional.empty();
        }
        
        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            return Optional.of(new Gson().fromJson(reader, Function.class));
        } catch (IOException e) {
            return Optional.empty();
        }
    }
    
    private static Map<String, List<TextEdit>> addMcpToolAnnotation(Map<String, List<TextEdit>> textEdits, 
                                                                   String functionName, String toolDescription) {
        String annotation = "@" + MCP + ":Tool" + SPACE + "{" + NEW_LINE +
                           "    description: \"" + toolDescription + "\"" + NEW_LINE +
                           "}" + NEW_LINE;
        
        String remoteFunctionPattern = REMOTE + SPACE + "function" + SPACE + functionName;
        
        textEdits.values().stream()
            .flatMap(List::stream)
            .filter(edit -> edit.getNewText().contains(remoteFunctionPattern))
            .findFirst()
            .ifPresent(edit -> edit.setNewText(
                edit.getNewText().replace(remoteFunctionPattern, annotation + remoteFunctionPattern)));
        
        return textEdits;
    }
}
