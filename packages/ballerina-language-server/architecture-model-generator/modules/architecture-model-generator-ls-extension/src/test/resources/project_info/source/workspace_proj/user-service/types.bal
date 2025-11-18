public type User record {
    string id;
    string name;
    string email;
    string role;
    string createdAt;
};

public type UserInput record {
    string name;
    string email;
    string role;
};

public enum UserRole {
    ADMIN,
    USER,
    GUEST
}

public type UserProfile record {
    *User;
    string bio?;
    string avatarUrl?;
};
