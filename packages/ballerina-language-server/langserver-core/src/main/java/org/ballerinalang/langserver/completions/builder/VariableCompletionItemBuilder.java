/*
 *  Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
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
package org.ballerinalang.langserver.completions.builder;

import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.completions.util.ItemResolverConstants;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionItemKind;
import org.eclipse.lsp4j.CompletionItemLabelDetails;

/**
 * This class is being used to build variable type completion item.
 *
 * @since 1.0.0
 */
public final class VariableCompletionItemBuilder {

    private static final String CONFIGURABLE_CATEGORY = "Configurable";
    private static final String LISTENER_CATEGORY = "Listener";
    private static final String CLIENT_CATEGORY = "Client";

    private VariableCompletionItemBuilder() {
    }

    /**
     * Creates and returns a completion item.
     *
     * @param varSymbol BSymbol
     * @param label     label
     * @param type      variable type
     * @return {@link CompletionItem}
     */
    public static CompletionItem build(VariableSymbol varSymbol, String label, String type) {
        CompletionItem item = new CompletionItem();
        item.setLabel(label);
        String insertText = CommonUtil.escapeSpecialCharsInInsertText(label);
        item.setInsertText(insertText);
        String detail = (type.isEmpty()) ? ItemResolverConstants.NONE : type;
        item.setDetail(detail);

        CompletionItemLabelDetails labelDetails = new CompletionItemLabelDetails();
        labelDetails.setDetail(" " + detail);
        if (varSymbol != null) {
            if (varSymbol.qualifiers().contains(Qualifier.CONFIGURABLE)) {
                labelDetails.setDescription(CONFIGURABLE_CATEGORY);
            } else if (varSymbol.qualifiers().contains(Qualifier.LISTENER)) {
                labelDetails.setDescription(LISTENER_CATEGORY);
            } else if (varSymbol.typeDescriptor() instanceof TypeReferenceTypeSymbol typeReferenceTypeSymbol) {
                TypeSymbol typeSymbol = typeReferenceTypeSymbol.typeDescriptor();
                if (typeSymbol instanceof ClassSymbol classSymbol
                        && classSymbol.qualifiers().contains(Qualifier.CLIENT)) {
                    labelDetails.setDescription(CLIENT_CATEGORY);
                }
            }
        }
        item.setLabelDetails(labelDetails);

        setMeta(item, varSymbol);
        return item;
    }

    private static void setMeta(CompletionItem item, VariableSymbol varSymbol) {
        item.setKind(CompletionItemKind.Variable);
        if (varSymbol == null) {
            return;
        }
        if (varSymbol.documentation().isPresent() && varSymbol.documentation().get().description().isPresent()) {
            item.setDocumentation(varSymbol.documentation().get().description().get());
        }
    }
}
