public type Response record {
    int statusCode;
    string message;
    json data?;
};

public type ErrorResponse record {
    int statusCode;
    string errorMessage;
    string errorCode;
};

public type RequestMetadata record {
    string requestId;
    string timestamp;
    string userId?;
};
