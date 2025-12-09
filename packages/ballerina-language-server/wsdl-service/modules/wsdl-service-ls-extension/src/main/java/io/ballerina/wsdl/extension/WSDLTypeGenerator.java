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

package io.ballerina.wsdl.extension;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.wsdl.core.WsdlToBallerina;
import io.ballerina.wsdl.core.WsdlToBallerinaResponse;
import io.ballerina.wsdl.core.diagnostic.DiagnosticMessage;
import io.ballerina.wsdl.core.generator.GeneratedSource;
import org.eclipse.lsp4j.TextEdit;
import org.xml.sax.InputSource;

import java.io.ByteArrayInputStream;
import java.nio.charset.Charset;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.wsdl.Definition;
import javax.wsdl.WSDLException;
import javax.wsdl.factory.WSDLFactory;
import javax.wsdl.xml.WSDLReader;

/**
 * Generates Ballerina types from WSDL file.
 *
 * @since 1.4.0
 */
public class WSDLTypeGenerator {
    private static final String TYPES_FILE_NAME = "types.bal";
    private static final String CLIENT_FILE_NAME = "client.bal";
    private static final String LS = System.lineSeparator();

    private final String wsdlContent;
    private final Path projectPath;
    private final String portName;
    private final String[] operations;
    private final Gson gson;

    /**
     * Constructor for WSDLTypeGenerator.
     *
     * @param wsdlContent  The WSDL content as string
     * @param projectPath  The project directory path
     * @param portName     The port name to use (optional)
     * @param operations   The operations to include (optional, null/empty = all operations)
     */
    public WSDLTypeGenerator(String wsdlContent, Path projectPath, String portName, String[] operations) {
        this.wsdlContent = wsdlContent;
        this.projectPath = projectPath;
        this.portName = portName != null ? portName : "";
        this.operations = operations != null ? operations : new String[0];
        this.gson = new Gson();
    }

    /**
     * Generates Ballerina types and client class from the WSDL content in a generated module folder.
     * The types (schema types and envelope types) will be generated in generated/<module>/types.bal.
     * The client class and its imports will be generated in generated/<module>/client.bal.
     *
     * @param module The target module name for the generated files
     * @return JsonElement containing the ClientSource with isModuleExists and text edits map
     * @throws Exception if an error occurs during type generation
     */
    public JsonElement generateTypes(String module) throws Exception {
        if (module == null || module.isEmpty()) {
            throw new WSDLGenerationException("Module name cannot be null or empty");
        }
        WsdlToBallerinaResponse wsdlResponse;
        try {
            Definition wsdlDefinition = parseWSDLContent(wsdlContent);
            WsdlToBallerina wsdlToBallerina = new WsdlToBallerina();
            wsdlResponse = new WsdlToBallerinaResponse();
            List<DiagnosticMessage> diagnosticMessages = new ArrayList<>();

            // Generate from WSDL - Pass empty string for outputDirectory as we'll handle file operations
            wsdlToBallerina.generateFromWSDL(wsdlResponse, wsdlDefinition, "",
                                            diagnosticMessages, operations, portName);

            if (!diagnosticMessages.isEmpty()) {
                StringBuilder errorMessages = new StringBuilder();
                for (DiagnosticMessage diagnostic : diagnosticMessages) {
                    if (diagnostic.getSeverity().toString().equals("ERROR")) {
                        errorMessages.append(diagnostic.getDescription()).append(LS);
                    }
                }
                if (!errorMessages.isEmpty()) {
                    throw new WSDLGenerationException("Errors occurred while generating types from WSDL:" + LS +
                            errorMessages);
                }
            }
        } catch (WSDLException e) {
            throw new WSDLGenerationException("Failed to parse WSDL content: " + e.getMessage(), e);
        }

        Path outputPath = projectPath.resolve("generated").resolve(module);
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();

        GeneratedSource typesSource = wsdlResponse.getTypesSource();
        if (typesSource != null && typesSource.content() != null && !typesSource.content().isEmpty()) {
            List<TextEdit> typesEdits = new ArrayList<>();
            typesEdits.add(new TextEdit(CommonUtils.toRange(LinePosition.from(0, 0)), typesSource.content()));
            textEditsMap.put(outputPath.resolve(TYPES_FILE_NAME), typesEdits);
        }

        List<GeneratedSource> clientSources = wsdlResponse.getClientSources();
        if (clientSources != null && !clientSources.isEmpty()) {
            GeneratedSource clientSource = clientSources.getFirst();
            if (clientSource != null && clientSource.content() != null && !clientSource.content().isEmpty()) {
                List<TextEdit> clientEdits = new ArrayList<>();
                clientEdits.add(new TextEdit(CommonUtils.toRange(LinePosition.from(0, 0)), clientSource.content()));
                textEditsMap.put(outputPath.resolve(CLIENT_FILE_NAME), clientEdits);
            }
        }
        if (textEditsMap.isEmpty()) {
            throw new WSDLGenerationException("No types or client code were generated from the provided WSDL file");
        }
        ClientSource clientSourceResult = new ClientSource(textEditsMap);
        return gson.toJsonTree(clientSourceResult);
    }

    /**
     * Parses WSDL content string into a WSDL Definition object.
     *
     * @param wsdlDefinitionText WSDL content as string
     * @return Parsed WSDL Definition
     * @throws WSDLException if parsing fails
     */
    private Definition parseWSDLContent(String wsdlDefinitionText) throws WSDLException {
        WSDLReader reader = WSDLFactory.newInstance().newWSDLReader();
        reader.setFeature("javax.wsdl.verbose", false);
        reader.setFeature("javax.wsdl.importDocuments", true);
        return reader.readWSDL(null, new InputSource(
                new ByteArrayInputStream(wsdlDefinitionText.getBytes(Charset.defaultCharset()))));
    }

    /**
     * Record class to hold the client source generation result.
     *
     * @param textEditsMap   Map of file paths to text edits
     */
    private record ClientSource(Map<Path, List<TextEdit>> textEditsMap) {
    }

    /**
     * Custom exception for WSDL generation errors.
     */
    public static class WSDLGenerationException extends Exception {
        public WSDLGenerationException(String message) {
            super(message);
        }

        public WSDLGenerationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
