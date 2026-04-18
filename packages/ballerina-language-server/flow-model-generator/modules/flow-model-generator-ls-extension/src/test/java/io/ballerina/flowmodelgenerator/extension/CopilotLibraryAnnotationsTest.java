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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.ballerina.flowmodelgenerator.core.copilot.service.AnnotationLoader;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Tests for the DB-backed Copilot annotation loader.
 * Verifies the annotation JSON shape for FTP and that non-covered libraries return empty.
 *
 * @since 1.7.0
 */
public class CopilotLibraryAnnotationsTest {

    @Test
    public void testFtpAnnotationsShape() {
        JsonArray annotations = AnnotationLoader.loadFromServiceIndex("ballerina/ftp");

        Assert.assertEquals(annotations.size(), 2,
                "Expected 2 annotations for ballerina/ftp, got: " + annotations);

        JsonObject serviceConfig = findByName(annotations, "ServiceConfig");
        Assert.assertNotNull(serviceConfig, "ServiceConfig annotation missing for ballerina/ftp");
        Assert.assertEquals(serviceConfig.get("attachmentPoint").getAsString(), "SERVICE");
        Assert.assertTrue(serviceConfig.has("displayName"));
        Assert.assertTrue(serviceConfig.has("description"));
        assertInternalTypeConstraint(serviceConfig, "FtpServiceConfig");

        JsonObject functionConfig = findByName(annotations, "FunctionConfig");
        Assert.assertNotNull(functionConfig, "FunctionConfig annotation missing for ballerina/ftp");
        Assert.assertEquals(functionConfig.get("attachmentPoint").getAsString(), "OBJECT_METHOD");
        assertInternalTypeConstraint(functionConfig, "FtpFunctionConfig");
    }

    @Test
    public void testUncoveredLibraryReturnsEmpty() {
        for (String lib : new String[]{"ballerina/graphql", "ballerinax/jms"}) {
            JsonArray annotations = AnnotationLoader.loadFromServiceIndex(lib);
            Assert.assertTrue(annotations.isEmpty(),
                    "Expected empty annotations for non-covered library: " + lib
                            + " but got: " + annotations);
        }
    }

    @Test
    public void testCoveredLibraryWithoutAnnotationsReturnsEmpty() {
        // kafka is covered but has no rows in the Annotation table
        JsonArray annotations = AnnotationLoader.loadFromServiceIndex("ballerinax/kafka");
        Assert.assertTrue(annotations.isEmpty(),
                "Expected empty annotations for kafka (covered, no DB rows)");
    }

    private static JsonObject findByName(JsonArray annotations, String name) {
        for (int i = 0; i < annotations.size(); i++) {
            JsonObject obj = annotations.get(i).getAsJsonObject();
            if (name.equals(obj.get("name").getAsString())) {
                return obj;
            }
        }
        return null;
    }

    private static void assertInternalTypeConstraint(JsonObject annotation, String expectedRecordName) {
        Assert.assertTrue(annotation.has("typeConstraint"),
                "Missing typeConstraint on annotation: " + annotation);
        JsonObject typeConstraint = annotation.getAsJsonObject("typeConstraint");
        Assert.assertEquals(typeConstraint.get("name").getAsString(), expectedRecordName,
                "typeConstraint.name mismatch");
        Assert.assertTrue(typeConstraint.has("links"),
                "typeConstraint should carry links for a package-prefixed type");
        JsonArray links = typeConstraint.getAsJsonArray("links");
        Assert.assertEquals(links.size(), 1, "Expected exactly one link");
        JsonObject link = links.get(0).getAsJsonObject();
        Assert.assertEquals(link.get("category").getAsString(), "internal");
        Assert.assertEquals(link.get("recordName").getAsString(), expectedRecordName);
    }
}
