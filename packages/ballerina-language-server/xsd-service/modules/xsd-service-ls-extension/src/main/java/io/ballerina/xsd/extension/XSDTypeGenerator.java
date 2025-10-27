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

package io.ballerina.xsd.extension;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.projects.Document;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.xsd.core.XSDToRecord;
import io.ballerina.xsd.core.diagnostic.XSDDiagnostic;
import io.ballerina.xsd.core.response.Response;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Generates Ballerina types from XSD schema.
 *
 * @since 1.4.0
 */
public class XSDTypeGenerator {
    private static final String DEFAULT_TARGET_FILE = "types.bal";
    private static final String LS = System.lineSeparator();

    private final String xsdContent;
    private final Path projectPath;
    private final WorkspaceManager workspaceManager;
    private final Gson gson;

    public XSDTypeGenerator(String xsdContent, Path projectPath, WorkspaceManager workspaceManager) {
        this.xsdContent = xsdContent;
        this.projectPath = projectPath;
        this.workspaceManager = workspaceManager;
        this.gson = new Gson();
    }

    /**
     * Generates Ballerina types from the XSD content and returns text edits to be applied.
     * The types will always be appended to types.bal file.
     *
     * @return JsonElement containing the text edits to be applied
     * @throws Exception if an error occurs during type generation
     */
    public JsonElement generateTypes() throws Exception {
        String targetFileName = DEFAULT_TARGET_FILE;

        // Parse XSD and generate types using the public API
        // XSDToRecord.generateNodes accepts xsdContent directly and returns NodeResponse
        // But we want the formatted string output, so we use the convert method
        Response response;
        try {
            // Use reflection to access the package-private parseXSD method or
            // parse the XSD ourselves
            java.io.ByteArrayInputStream inputStream =
                new java.io.ByteArrayInputStream(xsdContent.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            javax.xml.parsers.DocumentBuilderFactory dbFactory =
                javax.xml.parsers.DocumentBuilderFactory.newInstance();
            dbFactory.setNamespaceAware(true);
            javax.xml.parsers.DocumentBuilder docBuilder = dbFactory.newDocumentBuilder();
            org.w3c.dom.Document xsdDocument = docBuilder.parse(inputStream);
            response = XSDToRecord.convert(xsdDocument);
        } catch (javax.xml.parsers.ParserConfigurationException | org.xml.sax.SAXException |
                 java.io.IOException e) {
            throw new XSDGenerationException("Failed to parse XSD content: " + e.getMessage(), e);
        }

        // Check for errors in diagnostics
        List<XSDDiagnostic> diagnostics = response.diagnostics();
        if (diagnostics != null && !diagnostics.isEmpty()) {
            StringBuilder errorMessages = new StringBuilder();
            for (XSDDiagnostic diagnostic : diagnostics) {
                if (diagnostic.getSeverity().equals("ERROR")) {
                    errorMessages.append(diagnostic.message()).append(LS);
                }
            }
            if (errorMessages.length() > 0) {
                throw new XSDGenerationException("Errors occurred while generating types from XSD:" + LS +
                        errorMessages.toString());
            }
        }

        String generatedTypes = response.types();
        if (generatedTypes == null || generatedTypes.isEmpty()) {
            throw new XSDGenerationException("No types were generated from the provided XSD schema");
        }

        // Prepare text edits to append to target file
        Path targetFilePath = projectPath.resolve(targetFileName);
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();

        // Load the document
        Optional<Document> documentOpt = this.workspaceManager.document(targetFilePath);

        if (documentOpt.isPresent()) {
            // Append to existing file
            Document document = documentOpt.get();
            ModulePartNode modulePartNode = document.syntaxTree().rootNode();
            LinePosition endPos = LinePosition.from(modulePartNode.lineRange().endLine().line() + 1, 0);

            // Add newlines before the generated types for better formatting
            String contentToAppend = LS + LS + generatedTypes;
            textEditsMap.put(targetFilePath, List.of(new TextEdit(CommonUtils.toRange(endPos), contentToAppend)));
        } else {
            // Create new file if it doesn't exist
            LinePosition startPos = LinePosition.from(0, 0);
            textEditsMap.put(targetFilePath, List.of(new TextEdit(CommonUtils.toRange(startPos), generatedTypes)));
        }

        return gson.toJsonTree(textEditsMap);
    }

    /**
     * Custom exception for XSD generation errors.
     */
    public static class XSDGenerationException extends Exception {
        public XSDGenerationException(String message) {
            super(message);
        }

        public XSDGenerationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
