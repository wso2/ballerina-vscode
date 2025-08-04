package io.ballerina.projectservice.extension;

import io.ballerina.projectservice.extension.response.MigrationToolListResponse;
import org.ballerinalang.langserver.BallerinaLanguageServer;
import org.ballerinalang.langserver.util.TestUtil;
import org.eclipse.lsp4j.jsonrpc.Endpoint;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class ProjectServiceTest {

    private Endpoint serviceEndpoint;
    private BallerinaLanguageServer languageServer;

    @BeforeClass
    public void init() {
        this.languageServer = new BallerinaLanguageServer();
        TestUtil.LanguageServerBuilder builder = TestUtil.newLanguageServer().withLanguageServer(languageServer);
        this.serviceEndpoint = builder.build();
    }

    @Test
    public void testGetMigrationTools() throws ExecutionException, InterruptedException {
        CompletableFuture<?> result = serviceEndpoint.request("projectService/getMigrationTools", null);
        MigrationToolListResponse response = (MigrationToolListResponse) result.get();
        Assert.assertTrue(Objects.nonNull(response.tools()));
        Assert.assertFalse(response.tools().isEmpty());
    }
}