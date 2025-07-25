import ballerina/ai;
import ballerinax/ai.openai;

final ai:Wso2ModelProvider _suggestMovieNameModel = check ai:getDefaultModelProvider();

function suggestMovieName(string genre, int n) returns string|error => natural (_suggestMovieNameModel) {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Suggest a movie name matching to the genre given:
    ${genre}
};

final openai:ModelProvider _rateMovieModel = check new ("", openai:GPT_4_TURBO_2024_04_09);

function rateMovie(string movieName) returns int|error => natural (_rateMovieModel) {
    **Assumption**
    Think yourself as a movie expert

    **What to do**
    Give rating for the movie ${movieName} out of 10 based on your opinion
};

function summarizeBlog(ai:ModelProvider model, Blog blog) returns Summary|error => natural (model) {
    Think yourself as a blog reviewer and summarize the following blog

    **title**
    ${blog.title}

    **content**
    ${blog.content}
};

function cleanCode() returns string {
    return "cleaned";
}

