import sample_project_with_persist.testdb;

final testdb:Client testdb = check new (testdbHost, testdbPort, testdbUser, testdbPassword, testdbDatabase);
