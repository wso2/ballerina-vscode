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

import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import io.ballerina.flowmodelgenerator.core.expressioneditor.semantictokens.ExpressionTokenTypes;
import io.ballerina.flowmodelgenerator.extension.request.ExpressionEditorSemanticTokensRequest;
import io.ballerina.modelgenerator.commons.AbstractLSTest;
import io.ballerina.tools.text.LinePosition;
import org.eclipse.lsp4j.SemanticTokens;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tests for the expression editor semantic tokens service.
 *
 * @since 2.0.0
 */
public class ExpressionEditorSemanticTokensTest extends AbstractLSTest {

    private static final Type SEMANTIC_TOKENS_TYPE = new TypeToken<SemanticTokens>() { }.getType();

    @Override
    @Test(dataProvider = "data-provider")
    public void test(Path config) throws IOException {
        Path configJsonPath = configDir.resolve(config);
        TestConfig testConfig = gson.fromJson(Files.newBufferedReader(configJsonPath), TestConfig.class);

        // Validate token types before running test
        validateTokenTypes(testConfig.expectedTokens());

        // Create request with filePath, position, and expression
        String sourcePath = getSourcePath(testConfig.filePath());
        ExpressionEditorSemanticTokensRequest request =
                new ExpressionEditorSemanticTokensRequest(sourcePath, testConfig.position(), testConfig.expression());
        JsonObject response = getResponse(request);

        SemanticTokens actualSemanticTokens = gson.fromJson(response, SEMANTIC_TOKENS_TYPE);
        SemanticTokens expectedSemanticTokens = convertToSemanticTokens(testConfig.expectedTokens());

        if (!compareSemanticTokens(actualSemanticTokens, expectedSemanticTokens)) {
            // Convert actual tokens back to readable format for display
            List<ExpectedToken> actualReadable = convertFromSemanticTokens(actualSemanticTokens);
            TestConfig updatedConfig = new TestConfig(
                    testConfig.description(),
                    testConfig.filePath(),
                    testConfig.position(),
                    testConfig.expression(),
                    actualReadable
            );
//            updateConfig(configJsonPath, updatedConfig);
            Assert.fail(String.format("Failed test: '%s' (%s)%nExpected: %s%nActual: %s",
                    testConfig.description(), configJsonPath,
                    testConfig.expectedTokens(), actualReadable));
        }
    }

    @Override
    protected String getResourceDir() {
        return "semantic_tokens";
    }

    @Override
    protected Class<? extends AbstractLSTest> clazz() {
        return ExpressionEditorSemanticTokensTest.class;
    }

    @Override
    protected String getApiName() {
        return "semanticTokens";
    }

    @Override
    protected String getServiceName() {
        return "expressionEditor";
    }

    /**
     * Validates that all token types in the expected tokens match the ExpressionTokenTypes enum.
     *
     * @param tokens List of expected tokens to validate
     */
    private void validateTokenTypes(List<ExpectedToken> tokens) {
        // Build a set of valid token type IDs from the enum
        Set<Integer> validTokenTypes = new HashSet<>();
        for (ExpressionTokenTypes tokenType : ExpressionTokenTypes.values()) {
            validTokenTypes.add(tokenType.getId());
        }

        // Validate each token type
        for (ExpectedToken token : tokens) {
            if (!validTokenTypes.contains(token.type())) {
                // Build error message with all valid types
                String validTypesStr = Arrays.stream(ExpressionTokenTypes.values())
                        .map(t -> t.getId() + " (" + t.name() + ")")
                        .collect(Collectors.joining(", "));
                Assert.fail(String.format("Invalid token type: %d. Valid types are: %s",
                        token.type(), validTypesStr));
            }
        }
    }

    /**
     * Converts readable ExpectedToken format to LSP SemanticTokens format (delta-encoded).
     *
     * @param expectedTokens List of expected tokens in absolute position format
     * @return SemanticTokens with delta-encoded data array
     */
    private SemanticTokens convertToSemanticTokens(List<ExpectedToken> expectedTokens) {
        List<Integer> data = new ArrayList<>();
        int prevLine = 0;
        int prevCol = 0;

        for (ExpectedToken token : expectedTokens) {
            // Calculate deltas
            int lineDelta = token.line() - prevLine;
            int colDelta = (token.line() == prevLine) ? (token.col() - prevCol) : token.col();

            // Add 5 integers per token: [lineDelta, colDelta, length, type, modifiers]
            data.add(lineDelta);
            data.add(colDelta);
            data.add(token.length());
            data.add(token.type());
            data.add(token.modifiers());

            // Update previous position
            prevLine = token.line();
            prevCol = token.col();
        }

        return new SemanticTokens(data);
    }

    /**
     * Converts LSP SemanticTokens format back to readable ExpectedToken format for error messages.
     *
     * @param semanticTokens SemanticTokens with delta-encoded data
     * @return List of ExpectedToken in absolute position format
     */
    private List<ExpectedToken> convertFromSemanticTokens(SemanticTokens semanticTokens) {
        List<ExpectedToken> tokens = new ArrayList<>();
        if (semanticTokens == null || semanticTokens.getData() == null) {
            return tokens;
        }

        List<Integer> data = semanticTokens.getData();
        int currentLine = 0;
        int currentCol = 0;

        for (int i = 0; i < data.size(); i += 5) {
            int lineDelta = data.get(i);
            int colDelta = data.get(i + 1);
            int length = data.get(i + 2);
            int type = data.get(i + 3);
            int modifiers = data.get(i + 4);

            // Calculate absolute position
            currentLine += lineDelta;
            if (lineDelta > 0) {
                currentCol = colDelta;
            } else {
                currentCol += colDelta;
            }

            tokens.add(new ExpectedToken(currentLine, currentCol, length, type, modifiers));
        }

        return tokens;
    }

    /**
     * Compares two SemanticTokens objects for equality.
     *
     * @param actual   Actual semantic tokens from API
     * @param expected Expected semantic tokens
     * @return true if they match, false otherwise
     */
    private boolean compareSemanticTokens(SemanticTokens actual, SemanticTokens expected) {
        if (actual == null && expected == null) {
            return true;
        }
        if (actual == null || expected == null) {
            log.error("SemanticTokens mismatch: one is null. actual={}, expected={}", actual, expected);
            return false;
        }

        List<Integer> actualData = actual.getData();
        List<Integer> expectedData = expected.getData();

        if (actualData == null && expectedData == null) {
            return true;
        }
        if (actualData == null || expectedData == null) {
            log.error("Token data mismatch: one is null. actual size={}, expected size={}",
                    actualData == null ? 0 : actualData.size(),
                    expectedData == null ? 0 : expectedData.size());
            return false;
        }

        if (actualData.size() != expectedData.size()) {
            log.error("Token data size mismatch: actual={}, expected={}", actualData.size(), expectedData.size());
            return false;
        }

        for (int i = 0; i < actualData.size(); i++) {
            if (!actualData.get(i).equals(expectedData.get(i))) {
                log.error("Token data mismatch at index {}: actual={}, expected={}",
                        i, actualData.get(i), expectedData.get(i));
                return false;
            }
        }

        return true;
    }

    /**
     * Test configuration record with readable token format.
     *
     * @param description    Test description
     * @param filePath       Path to the Ballerina source file
     * @param position       Optional position for visible symbols
     * @param expression     Ballerina expression to analyze
     * @param expectedTokens Expected semantic tokens in readable format
     */
    private record TestConfig(
            String description,
            String filePath,
            LinePosition position,
            String expression,
            List<ExpectedToken> expectedTokens
    ) {
    }

    /**
     * Readable token format for test configs (absolute positions).
     *
     * @param line      Line number (0-indexed)
     * @param col       Column offset (0-indexed)
     * @param length    Token length in characters
     * @param type      Token type ID
     * @param modifiers Token modifiers bitmask (0=none)
     */
    private record ExpectedToken(
            int line,
            int col,
            int length,
            int type,
            int modifiers
    ) {
    }
}
