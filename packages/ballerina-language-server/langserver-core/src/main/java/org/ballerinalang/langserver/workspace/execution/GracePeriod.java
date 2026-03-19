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

package org.ballerinalang.langserver.workspace.execution;

import javax.annotation.Nonnull;

import java.time.Duration;

/**
 * Wraps process termination grace-period duration.
 *
 * @since 1.7.0
 */
public record GracePeriod(@Nonnull Duration duration) {

    public GracePeriod {
    }

    /**
     * Creates a GracePeriod from milliseconds.
     *
     * @param millis duration in milliseconds
     * @return new GracePeriod
     */
    public static GracePeriod ofMillis(long millis) {
        return new GracePeriod(Duration.ofMillis(millis));
    }

    /**
     * Returns the duration in milliseconds.
     *
     * @return duration in milliseconds
     */
    public long toMillis() {
        return duration.toMillis();
    }
}
