import sample_project_multiple_connections.mysqldb;
import sample_project_multiple_connections.postgresdb;

final mysqldb:Client mysqldb = check new (mysqldbHost, mysqldbPort, mysqldbUser, mysqldbPassword, mysqldbDatabase);
final postgresdb:Client postgresdb = check new (postgresdbHost, postgresdbPort, postgresdbUser, postgresdbPassword, postgresdbDatabase);
