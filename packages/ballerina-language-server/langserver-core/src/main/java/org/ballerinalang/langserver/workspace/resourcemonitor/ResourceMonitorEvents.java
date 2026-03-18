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

package org.ballerinalang.langserver.workspace.resourcemonitor;

/**
 * Event kind identifier for heap pressure detected events.
 *
 * <p>This is the package-local constant for RM-E1 (HeapPressureDetected).
 * T-036 will add this to the central {@link org.ballerinalang.langserver.workspace.eventbus.EventKind} enum.
 *
 * @since 1.7.0
 */
public final class ResourceMonitorEvents {

    /** RM-E1: Heap pressure detected event identifier. */
    public static final String RM_E1_HEAP_PRESSURE_DETECTED = "RM-E1";

    private ResourceMonitorEvents() {
        // Utility class - prevent instantiation
    }
}
