
final ai:Wso2ModelProvider _suggestMovieGenreModel= check ai:getDefaultModelProvider( ) ;
function suggestMovieGenre( string genre, int n) returns string|error => natural (_suggestMovieNameModel) {
**Assumption**
Think yourself as a movie expert

**What to do**
Suggest a movie name matching to the genre given:
${genre}
};


function suggestMovieName1(string genre, int i) returns string|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Suggest a movie name matching to the genre given:
    ${genre}

    **Output**
    string - The suggested movie name
};

function suggestMovieName2() returns string|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Suggest a movie name

    **Output**
    string - The suggested movie name
};

function rateMovie(string movieName) returns int|error => natural {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Give rating for the movie ${movieName} out of 10 based on your opinion

    **Output**
    int - number between 1 and 10 as the rating
};
