import ballerina/log;
import ballerinax/health.fhir.r4.international401;

public function main() returns error? {
    do {
        international401:PatientBirthPlace var1;
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
