type Location record {|
    string city;
    string country;
|};

type Address record {|
    string houseNo;
    string line1;
    string line2;
    string city;
    string country;
|};

type Employee record {|
    string name;
    string empId;
    string email;
    Location location;
|};

type Person record {|
    string name;
    string email;
    Address address;
|};

type Admission record {
    string empId;
    string admissionDate;
};

type Persons Person[];

enum Status {
    ACTIVE,
    INACTIVE,
    PENDING
}

type Department "Engineering"|"Sales"|"HR"|"Marketing";

type Priority 1|2|3|4|5;

type MixedValue string|int|boolean|decimal;

public type VertexAiAuth OAuth2RefreshConfig|ServiceAccountConfig|ServiceAccountJsonFilePath;

public type ServiceAccountJsonFilePath string;

public type OAuth2RefreshConfig readonly & record {|
    string clientId;
    string clientSecret;
    string refreshToken;
    string refreshUrl = "https://oauth2.googleapis.com/token";
|};

public type ServiceAccountConfig readonly & record {|
    string clientEmail;
    string privateKey;
    string[] scopes = ["https://www.googleapis.com/auth/cloud-platform"];
|};
