import ballerinax/health.fhir.r4.uscore311;

public type PatientDataOptionalized record {|
    string id?;
    string? name?;
    string? gender?;
    string? birthDate?;
|};

function transformTest(PatientDataOptionalized patient) returns uscore311:USCorePatientProfile => {
    identifier: [],
    name: []
};

