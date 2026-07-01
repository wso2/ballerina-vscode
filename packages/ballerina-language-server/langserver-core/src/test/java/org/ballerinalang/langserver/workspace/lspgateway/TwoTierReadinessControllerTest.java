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

package org.ballerinalang.langserver.workspace.lspgateway;

import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.concurrent.TimeUnit;

/**
 * Tests for {@link TwoTierReadinessController} two-tier readiness coordination.
 *
 * @since 1.7.0
 */
public class TwoTierReadinessControllerTest {

    @Test(groups = "readiness-initial-state")
    public void initialState_syntaxNotReady() {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        Assert.assertFalse(controller.isSyntaxReady());
    }

    @Test(groups = "readiness-initial-state")
    public void initialState_semanticNotReady() {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        Assert.assertFalse(controller.isSemanticReady());
    }

    @Test(groups = "readiness-syntax")
    public void markSyntaxReady_setsFlag() {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        controller.markSyntaxReady();
        Assert.assertTrue(controller.isSyntaxReady());
    }

    @Test(groups = "readiness-syntax")
    public void markSyntaxReady_isIdempotent() {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        controller.markSyntaxReady();
        controller.markSyntaxReady();
        controller.markSyntaxReady();
        Assert.assertTrue(controller.isSyntaxReady());
    }

    @Test(groups = "readiness-syntax")
    public void awaitSyntaxReady_returnsImmediatelyWhenReady() throws InterruptedException {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        controller.markSyntaxReady();

        boolean result = controller.awaitSyntaxReady(5, TimeUnit.SECONDS);
        Assert.assertTrue(result);
    }

    @Test(groups = "readiness-syntax")
    public void awaitSyntaxReady_blocksUntilReady() throws InterruptedException {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        // Start a background thread to mark ready after 100ms
        Thread markerThread = new Thread(() -> {
            try {
                Thread.sleep(100);
                controller.markSyntaxReady();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        markerThread.start();

        long startTime = System.currentTimeMillis();
        boolean result = controller.awaitSyntaxReady(5, TimeUnit.SECONDS);
        long elapsedMs = System.currentTimeMillis() - startTime;

        markerThread.join();
        Assert.assertTrue(result);
        Assert.assertTrue(elapsedMs >= 100 && elapsedMs < 2000, "Should have waited ~100ms");
    }

    @Test(groups = "readiness-syntax")
    public void awaitSyntaxReady_timeoutReturnsfalse() throws InterruptedException {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        boolean result = controller.awaitSyntaxReady(100, TimeUnit.MILLISECONDS);
        Assert.assertFalse(result);
    }

    @Test(groups = "readiness-semantic")
    public void markSemanticReady_setsFlag() {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        controller.markSemanticReady();
        Assert.assertTrue(controller.isSemanticReady());
    }

    @Test(groups = "readiness-semantic")
    public void markSemanticReady_isIdempotent() {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        controller.markSemanticReady();
        controller.markSemanticReady();
        controller.markSemanticReady();
        Assert.assertTrue(controller.isSemanticReady());
    }

    @Test(groups = "readiness-semantic")
    public void awaitSemanticReady_returnsImmediatelyWhenReady() throws InterruptedException {
        TwoTierReadinessController controller = new TwoTierReadinessController();
        controller.markSemanticReady();

        boolean result = controller.awaitSemanticReady(5, TimeUnit.SECONDS);
        Assert.assertTrue(result);
    }

    @Test(groups = "readiness-semantic")
    public void awaitSemanticReady_blocksUntilReady() throws InterruptedException {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        // Start a background thread to mark ready after 100ms
        Thread markerThread = new Thread(() -> {
            try {
                Thread.sleep(100);
                controller.markSemanticReady();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        markerThread.start();

        long startTime = System.currentTimeMillis();
        boolean result = controller.awaitSemanticReady(5, TimeUnit.SECONDS);
        long elapsedMs = System.currentTimeMillis() - startTime;

        markerThread.join();
        Assert.assertTrue(result);
        Assert.assertTrue(elapsedMs >= 100 && elapsedMs < 2000, "Should have waited ~100ms");
    }

    @Test(groups = "readiness-semantic")
    public void awaitSemanticReady_timeoutReturnsFalse() throws InterruptedException {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        boolean result = controller.awaitSemanticReady(100, TimeUnit.MILLISECONDS);
        Assert.assertFalse(result);
    }

    @Test(groups = "readiness-content-modified")
    public void contentModifiedHint_returnsCorrectErrorCode() {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        TwoTierReadinessController.ContentModifiedError error =
                controller.contentModifiedHint(2000);

        Assert.assertEquals(error.errorCode(), TwoTierReadinessController.ContentModifiedError.CONTENT_MODIFIED_CODE);
        Assert.assertEquals(error.errorCode(), -32801);
    }

    @Test(groups = "readiness-content-modified")
    public void contentModifiedHint_preservesRetryAfter() {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        TwoTierReadinessController.ContentModifiedError error =
                controller.contentModifiedHint(5000);

        Assert.assertEquals(error.retryAfterMs(), 5000);
    }

    @Test(groups = "readiness-content-modified")
    public void contentModifiedHint_hasMessage() {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        TwoTierReadinessController.ContentModifiedError error =
                controller.contentModifiedHint(2000);

        Assert.assertNotNull(error.message());
        Assert.assertFalse(error.message().isBlank());
    }

    @Test(groups = "readiness-content-modified")
    public void contentModifiedError_record_accessors() {
        TwoTierReadinessController.ContentModifiedError error =
                new TwoTierReadinessController.ContentModifiedError(-32801, "Test message", 1000);

        Assert.assertEquals(error.errorCode(), -32801);
        Assert.assertEquals(error.message(), "Test message");
        Assert.assertEquals(error.retryAfterMs(), 1000);
    }

    @Test(groups = "readiness-initial-state")
    public void tiers_independentlyControlled() {
        TwoTierReadinessController controller = new TwoTierReadinessController();

        // Mark only syntax ready
        controller.markSyntaxReady();
        Assert.assertTrue(controller.isSyntaxReady());
        Assert.assertFalse(controller.isSemanticReady());

        // Mark semantic ready
        controller.markSemanticReady();
        Assert.assertTrue(controller.isSyntaxReady());
        Assert.assertTrue(controller.isSemanticReady());
    }
}
