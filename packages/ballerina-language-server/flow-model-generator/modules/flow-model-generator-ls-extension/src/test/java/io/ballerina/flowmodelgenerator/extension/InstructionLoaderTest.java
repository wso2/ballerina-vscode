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

import io.ballerina.flowmodelgenerator.core.InstructionLoader;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.Optional;

/**
 * Unit tests for the InstructionLoader utility class.
 *
 * @since 1.0.1
 */
public class InstructionLoaderTest {

    @Test
    public void testLoadLibraryInstruction() {
        // Test loading library instruction for ballerina/ai
        Optional<String> instruction = InstructionLoader.loadLibraryInstruction("ballerina/ai");
        Assert.assertTrue(instruction.isPresent(), "Library instruction for ballerina/ai should exist");
        Assert.assertTrue(instruction.get().contains("Ballerina AI Library"),
                "Library instruction should contain expected content");
    }

    @Test
    public void testLoadServiceInstruction() {
        // Test loading service instruction for ballerina/http
        Optional<String> instruction = InstructionLoader.loadServiceInstruction("ballerina/http");
        Assert.assertTrue(instruction.isPresent(), "Service instruction for ballerina/http should exist");
        Assert.assertTrue(instruction.get().contains("Service writing instructions"),
                "Service instruction should contain expected content");
    }

    @Test
    public void testLoadTestInstruction() {
        // Test loading test instruction for ballerina/http
        Optional<String> instruction = InstructionLoader.loadTestInstruction("ballerina/http");
        Assert.assertTrue(instruction.isPresent(), "Test instruction for ballerina/http should exist");
        Assert.assertTrue(instruction.get().contains("Test Generation Instructions"),
                "Test instruction should contain expected content");
    }

    @Test
    public void testLoadNonExistentInstruction() {
        // Test loading instruction for non-existent package
        Optional<String> instruction = InstructionLoader.loadLibraryInstruction("non/existent");
        Assert.assertFalse(instruction.isPresent(),
                "Instruction for non-existent package should not be present");
    }

    @Test
    public void testLoadInstructionForPackageWithoutFile() {
        // Test loading library instruction for package that has service.md but no library.md
        Optional<String> libraryInstruction = InstructionLoader.loadLibraryInstruction("ballerina/http");
        Assert.assertFalse(libraryInstruction.isPresent(),
                "Library instruction for ballerina/http should not exist");

        // But service instruction should exist
        Optional<String> serviceInstruction = InstructionLoader.loadServiceInstruction("ballerina/http");
        Assert.assertTrue(serviceInstruction.isPresent(),
                "Service instruction for ballerina/http should exist");
    }

    @Test
    public void testHasAnyInstruction() {
        // Test package with instructions
        Assert.assertTrue(InstructionLoader.hasAnyInstruction("ballerina/http"),
                "ballerina/http should have at least one instruction file");

        // Test package without instructions
        Assert.assertFalse(InstructionLoader.hasAnyInstruction("non/existent"),
                "non/existent should not have any instruction files");
    }

    @Test
    public void testLoadTestInstructionForBallerina() {
        // Test loading test instruction for ballerina/test (library.md)
        Optional<String> instruction = InstructionLoader.loadLibraryInstruction("ballerina/test");
        Assert.assertTrue(instruction.isPresent(), "Library instruction for ballerina/test should exist");
    }

    @Test
    public void testLoadGraphQLServiceInstruction() {
        // Test loading service instruction for ballerina/graphql
        Optional<String> instruction = InstructionLoader.loadServiceInstruction("ballerina/graphql");
        Assert.assertTrue(instruction.isPresent(), "Service instruction for ballerina/graphql should exist");
    }

    @Test
    public void testLoadAIServiceInstruction() {
        // Test loading service instruction for ballerina/ai
        Optional<String> instruction = InstructionLoader.loadServiceInstruction("ballerina/ai");
        Assert.assertTrue(instruction.isPresent(), "Service instruction for ballerina/ai should exist");
    }
}
