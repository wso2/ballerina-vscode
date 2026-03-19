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

package org.ballerinalang.langserver.workspace;

import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Verifies deprecation metadata for workspace manager types.
 *
 * @since 1.7.0
 */
public class WorkspaceManagerDeprecationTest {

    @Test
    public void testBallerinaWorkspaceManagerIsDeprecatedForRemoval() {
        Deprecated deprecated = BallerinaWorkspaceManager.class.getAnnotation(Deprecated.class);

        Assert.assertNotNull(deprecated);
        Assert.assertEquals(deprecated.since(), "1.7.0");
        Assert.assertTrue(deprecated.forRemoval());
    }

    @Test
    public void testBallerinaWorkspaceManagerProxyIsDeprecatedForRemoval() {
        Deprecated deprecated = BallerinaWorkspaceManagerProxy.class.getAnnotation(Deprecated.class);

        Assert.assertNotNull(deprecated);
        Assert.assertEquals(deprecated.since(), "1.7.0");
        Assert.assertTrue(deprecated.forRemoval());
    }

    @Test
    public void testBallerinaWorkspaceManagerProxyImplIsDeprecatedForRemoval() {
        Deprecated deprecated = BallerinaWorkspaceManagerProxyImpl.class.getAnnotation(Deprecated.class);

        Assert.assertNotNull(deprecated);
        Assert.assertEquals(deprecated.since(), "1.7.0");
        Assert.assertTrue(deprecated.forRemoval());
    }
}
