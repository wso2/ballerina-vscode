import ballerinax/github;

final github:Client githubClientResult = check new ({
    auth: {
        token: ""
    }
});
