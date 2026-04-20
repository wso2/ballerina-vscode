/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core.copilot.service;

import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Tests for {@link ServiceIndexLoader#canonicalizeReturnType(String)}.
 *
 * @since 1.7.0
 */
public class ServiceIndexLoaderTest {

    @Test(description = "Already-canonical nullable form is returned unchanged.")
    public void testAlreadyNullable() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("error?"), "error?");
    }

    @Test(description = "Union with nil collapses to nullable shorthand.")
    public void testErrorWithNil() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("error|()"), "error?");
    }

    @Test(description = "Multi-member union with nil collapses correctly.")
    public void testMultiMemberUnionWithNil() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("int|string|()"), "int|string?");
    }

    @Test(description = "Union without nil is returned unchanged.")
    public void testUnionWithoutNil() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("anydata|error"), "anydata|error");
    }

    @Test(description = "Pure nil signature is preserved.")
    public void testPureNil() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("()"), "()");
    }

    @Test(description = "All-nil union collapses to a single nil.")
    public void testAllNil() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("()|()"), "()");
    }

    @Test(description = "Empty input is normalized to empty string.")
    public void testEmpty() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType(""), "");
    }

    @Test(description = "Null input is normalized to empty string.")
    public void testNull() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType(null), "");
    }

    @Test(description = "Parenthesized union with trailing nil keeps the parenthesized group intact.")
    public void testParenthesizedUnionWithNil() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("(int|string)|()"), "(int|string)?");
    }

    @Test(description = "Nested nil inside parens is not treated as a top-level nil member.")
    public void testNestedNilInsideParens() {
        Assert.assertEquals(ServiceIndexLoader.canonicalizeReturnType("(int|())|()"), "(int|())?");
    }
}
