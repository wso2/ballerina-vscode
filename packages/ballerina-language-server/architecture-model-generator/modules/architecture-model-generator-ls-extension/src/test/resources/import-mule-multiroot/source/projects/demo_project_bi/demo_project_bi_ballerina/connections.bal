import ballerinax/mysql;
import ballerinax/mysql.driver as _;

mysql:Client MySQL_Configuration = check new ("localhost", db_user, db_pwd, db_database, check int:fromString(db_port));
