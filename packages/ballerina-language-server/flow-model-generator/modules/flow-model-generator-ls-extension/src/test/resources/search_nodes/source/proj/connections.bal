import ballerina/grpc;
import ballerinax/redis;

final redis:Client redisClient = check new ();
final grpc:Client grpcClient = check new ("http://example.com");
string configValue = "test";
int numberValue = 42;
