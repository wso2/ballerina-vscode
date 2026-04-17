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

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.ballerina.compiler.api.symbols.AnnotationAttachPoint;
import io.ballerina.modelgenerator.commons.AnnotationAttachment;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

/**
 * Loads annotation descriptors from the service-index.sqlite database for Copilot.
 * Emits only annotations attached at SERVICE or OBJECT_METHOD points, and resolves
 * {@code type_constraint} via {@link TypeResolver} so the shape matches parameter types.
 *
 * @since 1.7.0
 */
public final class AnnotationLoader {

    private static final Logger LOGGER = Logger.getLogger(AnnotationLoader.class.getName());

    private static final Set<AnnotationAttachPoint> SUPPORTED_ATTACHMENT_POINTS = Set.of(
            AnnotationAttachPoint.SERVICE,
            AnnotationAttachPoint.OBJECT_METHOD);

    private AnnotationLoader() {
        // Prevent instantiation
    }

    /**
     * Loads annotations from the service-index for the given library.
     *
     * @param libraryName the library name (e.g., "ballerinax/ftp")
     * @return JsonArray of annotation objects, or an empty array if not covered or on failure
     */
    public static JsonArray loadFromServiceIndex(String libraryName) {
        JsonArray annotations = new JsonArray();

        String packageName = ServiceIndexLoader.stripOrg(libraryName);
        if (!ServiceIndexLoader.COVERED.contains(packageName)) {
            return annotations;
        }

        String org = libraryName.contains("/")
                ? libraryName.substring(0, libraryName.indexOf('/'))
                : "ballerinax";

        try {
            ServiceDatabaseManager db = ServiceDatabaseManager.getInstance();

            Optional<FunctionData> listenerOpt = db.getListener(org, packageName);
            if (listenerOpt.isEmpty()) {
                return annotations;
            }
            int packageId = Integer.parseInt(listenerOpt.get().packageId());

            List<AnnotationAttachment> attachments = db.getAnnotationAttachments(packageId);

            for (AnnotationAttachment attachment : attachments) {
                for (AnnotationAttachPoint point : attachment.attachmentPoints()) {
                    if (!SUPPORTED_ATTACHMENT_POINTS.contains(point)) {
                        continue;
                    }
                    annotations.add(buildAnnotationJson(attachment, point, packageName));
                }
            }
        } catch (RuntimeException e) {
            LOGGER.warning("Failed to load annotations from service-index for " + libraryName
                    + ": " + e.getMessage());
            return new JsonArray();
        }

        return annotations;
    }

    private static JsonObject buildAnnotationJson(AnnotationAttachment attachment,
                                                   AnnotationAttachPoint point,
                                                   String packageName) {
        JsonObject obj = new JsonObject();
        obj.addProperty("name", attachment.annotName());
        obj.addProperty("attachmentPoint", point.name());

        if (attachment.displayName() != null) {
            obj.addProperty("displayName", attachment.displayName());
        }
        if (attachment.description() != null) {
            obj.addProperty("description", attachment.description());
        }

        String typeConstraint = attachment.typeName();
        if (typeConstraint != null && !typeConstraint.isEmpty()) {
            obj.add("typeConstraint", TypeResolver.resolveTypeWithLinks(typeConstraint, packageName));
        }

        return obj;
    }
}
