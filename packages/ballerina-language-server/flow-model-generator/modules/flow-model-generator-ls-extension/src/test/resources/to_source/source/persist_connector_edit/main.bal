import new_connection1.db;

public function main() returns error? {
    db:Client dbClient = check new ("localhost", 3306, "root", "Test@123", "album_db");
    AlbumsType[] albums = check dbClient->/albums("Rock", 50.0d);
}
