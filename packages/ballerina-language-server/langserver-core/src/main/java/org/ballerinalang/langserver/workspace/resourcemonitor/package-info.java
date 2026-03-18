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
 * Resource Monitor bounded context (ADR-041).
 *
 * <p>This package contains the heap pressure monitoring infrastructure:
 * <ul>
 *   <li>{@link HeapPressureLevel} - graduated pressure levels</li>
 *   <li>{@link HeapPressureDetected} - RM-E1 event published when pressure is detected</li>
 * </ul>
 *
 * <p>The Resource Monitor observes JVM resource metrics and publishes graduated
 * pressure events to the event bus. It owns zero eviction or response logic.
 *
 * @since 1.7.0
 */
