import new_connection1.db;

public function main() returns error? {
    db:Client dbClient = check new ("localhost", 3306, "root", "Test@123", "album_db");
    db:Album[] albums = check dbClient->/albums("Rock", 50.0d);
    db:AlbumWithRelations[] albumsWithRelations = check dbClient->/albums("Rock", 50.0d);
}
