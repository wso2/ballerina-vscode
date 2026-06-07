import ballerina/http;

type Album record {|
    string title;
    string artist;
|};

public service class MusicService {
    *http:Service;

    private table<Album> key(title) albums = table [
        {title: "Blue Train", artist: "John Coltrane"},
        {title: "Jeru", artist: "Gerry Mulligan"}
    ];

    resource function get albums() returns Album[] {
        return self.albums.toArray();
    }

    resource function post albums(Album album) returns Album {
        self.albums.add(album);
        return album;
    }

    resource function get albums/[string title]() returns Album|http:NotFound {
        Album? album = self.albums[title];
        if album is () {
            return http:NOT_FOUND;
        }
        return album;
    }

    resource function delete albums/[string title]() returns http:Ok|http:NotFound {
        Album? removedAlbum = self.albums.remove(title);
        if removedAlbum is () {
            return http:NOT_FOUND;
        }
        return http:OK;
    }

    function init() returns error? {
        // Initialization logic
    }

    public function getAlbumCount() returns int {
        return self.albums.length();
    }
}
