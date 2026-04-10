import ballerina/http;
import ballerina/oauth2;

configurable http:PoolConfiguration poolConfig = ?;
configurable oauth2:RefreshTokenGrantConfig oauthConfig = ?;
