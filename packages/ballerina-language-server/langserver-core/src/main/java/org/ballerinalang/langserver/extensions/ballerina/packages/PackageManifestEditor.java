/*
 * Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.ballerinalang.langserver.extensions.ballerina.packages;

import com.google.gson.annotations.SerializedName;
import io.ballerina.projects.BallerinaToml;
import io.ballerina.projects.Project;
import io.ballerina.toml.semantic.ast.TomlArrayValueNode;
import io.ballerina.toml.semantic.ast.TomlKeyValueNode;
import io.ballerina.toml.semantic.ast.TomlTableNode;
import io.ballerina.toml.semantic.ast.TopLevelNode;
import io.ballerina.tools.text.LinePosition;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.eclipse.lsp4j.TextEdit;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

public final class PackageManifestEditor {
    private static final String PACKAGE = "package";
    private static final String KEYWORDS = "keywords";

    private PackageManifestEditor() {}

    static Map<String, List<TextEdit>> update(Project project, Request request) {
        validate(request);
        BallerinaToml ballerinaToml = project.currentPackage().ballerinaToml()
                .orElseThrow(() -> new IllegalArgumentException("Ballerina.toml not found"));
        TomlTableNode root = ballerinaToml.tomlAstNode();
        TopLevelNode packageNode = root.entries().get(PACKAGE);
        if (!(packageNode instanceof TomlTableNode packageTable)) {
            throw new IllegalArgumentException("Ballerina.toml does not contain a [package] section");
        }

        List<TextEdit> edits = new ArrayList<>();
        List<String> additions = new ArrayList<>();
        Patch patch = request.patch();
        if (patch.packageFields() != null) {
            updatePackageField(packageTable, "org", patch.packageFields().org(), edits, additions);
            updatePackageField(packageTable, "name", patch.packageFields().name(), edits, additions);
            updatePackageField(packageTable, "version", patch.packageFields().version(), edits, additions);
        }
        if (patch.keywords() != null) {
            updateKeywords(packageTable, patch.keywords(), edits, additions);
        }
        if (!additions.isEmpty()) {
            LinePosition insertAt = LinePosition.from(packageTable.location().lineRange().startLine().line() + 1, 0);
            edits.add(new TextEdit(PositionUtil.toRange(insertAt), String.join(System.lineSeparator(), additions)
                    + System.lineSeparator()));
        }
        return edits.isEmpty() ? Map.of() : Map.of(project.sourceRoot().resolve("Ballerina.toml").toString(), edits);
    }

    private static void updatePackageField(TomlTableNode packageTable, String field, String value,
                                           List<TextEdit> edits, List<String> additions) {
        if (value == null) {
            return;
        }
        TopLevelNode node = packageTable.entries().get(field);
        if (node instanceof TomlKeyValueNode keyValueNode) {
            edits.add(new TextEdit(PositionUtil.toRange(keyValueNode.value().location().lineRange()), quote(value)));
        } else {
            additions.add(field + " = " + quote(value));
        }
    }

    private static void updateKeywords(TomlTableNode packageTable, Keywords patch,
                                       List<TextEdit> edits, List<String> additions) {
        TopLevelNode node = packageTable.entries().get(KEYWORDS);
        if (node == null) {
            if (!patch.add().isEmpty()) {
                additions.add(KEYWORDS + " = " + array(patch.add()));
            }
            return;
        }
        if (!(node instanceof TomlKeyValueNode keyValueNode)
                || !(keyValueNode.value() instanceof TomlArrayValueNode arrayNode)) {
            throw new IllegalArgumentException("The [package].keywords value must be an array of strings");
        }

        List<Object> values = arrayNode.toNativeValue();
        if (!values.stream().allMatch(String.class::isInstance)) {
            throw new IllegalArgumentException("The [package].keywords value must be an array of strings");
        }
        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        for (Object keyword : values) {
            keywords.add((String) keyword);
        }
        boolean changed = keywords.addAll(patch.add());
        changed |= keywords.removeAll(patch.remove());
        if (!changed) {
            return;
        }
        if (keywords.isEmpty()) {
            edits.add(new TextEdit(PositionUtil.toRange(keyValueNode.location().lineRange()), ""));
        } else {
            edits.add(new TextEdit(PositionUtil.toRange(keyValueNode.value().location().lineRange()),
                    array(new ArrayList<>(keywords))));
        }
    }

    private static void validate(Request request) {
        if (request.patch() == null
                || (request.patch().packageFields() == null && request.patch().keywords() == null)) {
            throw new IllegalArgumentException("Package manifest patch must contain a change");
        }
        if (request.patch().packageFields() != null) {
            validateValue(request.patch().packageFields().org(), "org");
            validateValue(request.patch().packageFields().name(), "name");
            validateValue(request.patch().packageFields().version(), "version");
        }
        if (request.patch().keywords() != null) {
            LinkedHashSet<String> additions = nonEmptyKeywords(request.patch().keywords().add());
            LinkedHashSet<String> removals = nonEmptyKeywords(request.patch().keywords().remove());
            additions.retainAll(removals);
            if (!additions.isEmpty()) {
                throw new IllegalArgumentException("A keyword cannot be added and removed in the same patch");
            }
        }
    }

    private static void validateValue(String value, String field) {
        if (value != null && value.isBlank()) {
            throw new IllegalArgumentException("Package " + field + " must not be blank");
        }
    }

    private static LinkedHashSet<String> nonEmptyKeywords(List<String> keywords) {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (String keyword : keywords) {
            if (keyword == null || keyword.isBlank()) {
                throw new IllegalArgumentException("Package keywords must not be blank");
            }
            values.add(keyword);
        }
        return values;
    }

    private static String array(List<String> values) {
        return "[" + values.stream().map(PackageManifestEditor::quote).reduce((left, right) -> left + ", " + right)
                .orElse("") + "]";
    }

    private static String quote(String value) {
        return '"' + value.replace("\\", "\\\\").replace("\"", "\\\"") + '"';
    }

    public record Request(String projectPath, Patch patch) {
    }

    public record Patch(@SerializedName("package") PackageFields packageFields, Keywords keywords) {
    }

    public record PackageFields(String org, String name, String version) {
    }

    public record Keywords(List<String> add, List<String> remove) {
        public Keywords {
            add = add == null ? List.of() : List.copyOf(add);
            remove = remove == null ? List.of() : List.copyOf(remove);
        }
    }

    public record Response(Map<String, List<TextEdit>> textEdits, String errorMsg) {
    }
}
