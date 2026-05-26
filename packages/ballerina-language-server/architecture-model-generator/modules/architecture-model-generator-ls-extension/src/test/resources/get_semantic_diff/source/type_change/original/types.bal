public type Patient record {|
    string patientId;
    string firstName;
    string lastName;
    string dateOfBirth;
    Gender gender;
    ContactInfo contactInfo;
    Address address;
    EmergencyContact[] emergencyContacts?;
    string insuranceNumber?;
    string registrationDate;
|};

public enum Gender {
    MALE,
    FEMALE,
    OTHER,
    PREFER_NOT_TO_SAY
}

public type ContactInfo record {|
    string primaryPhone;
    string secondaryPhone?;
    string email?;
|};

public type Address record {|
    string streetAddress;
    string city;
    string state;
    string postalCode;
    string country;
|};

public type EmergencyContact record {|
    string name;
    string relationship;
    string phoneNumber;
    string alternatePhone?;
|};
