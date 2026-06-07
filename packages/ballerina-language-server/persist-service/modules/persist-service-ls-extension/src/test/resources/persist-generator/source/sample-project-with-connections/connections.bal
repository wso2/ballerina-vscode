import sample_project_with_connections.first.testdb;

final testdb:Client first = check new (firstHost, firstPort, firstUser, firstPassword, firstDatabase);
