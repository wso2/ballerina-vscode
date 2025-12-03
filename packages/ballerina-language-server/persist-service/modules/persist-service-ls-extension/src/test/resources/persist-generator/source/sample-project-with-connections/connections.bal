// This file demonstrates an existing connections file with a pre-existing client
// The test will append a new client to this file

import ballerina/http;
import ballerinax/mysql;
import ballerinax/mysql.driver as _;

final mysql:Client mysqlClient = check new ("localhost", "root", "root@123", "demo", 3306);
final http:Client httpClient = check new ("http://localhost:8080");
