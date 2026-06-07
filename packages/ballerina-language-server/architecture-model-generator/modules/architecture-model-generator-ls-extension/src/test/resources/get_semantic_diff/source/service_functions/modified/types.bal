// Pet record type for the pet store API
public type Pet record {
    string id?;
    string name;
    string category?;
    string status?; // available, pending, sold
    string[] tags?;
    string photoUrl?;
};

// Response types
public type PetResponse record {
    boolean success;
    string message?;
    Pet data?;
};

public type ErrorResponse record {
    boolean success = false;
    string message;
    string details?;
};
