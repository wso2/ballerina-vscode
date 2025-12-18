import ballerina/http;
import ballerina/uuid;
import ballerina/log;

listener http:Listener unusedListener = new (8080);

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /api/v1/petsstore on httpDefaultListener {
    resource function get pets/[string petId]() returns ErrorResponse|PetResponse {
        do {
            // Call external pet store API to get pet by ID
            http:Response response = check petStoreClient->get("/pet/" + petId);
            
            if (response.statusCode == 200) {
                json petData = check response.getJsonPayload();
                PetResponse successResponse = {
                    success: true,
                    message: "Pet retrieved successfully",
                    data: check petData.cloneWithType(Pet)
                };
                return successResponse;
            } else if (response.statusCode == 404) {
                ErrorResponse notFoundResponse = {
                    success: false,
                    message: "Pet not found",
                    details: "No pet found with ID: " + petId
                };
                return notFoundResponse;
            } else {
                ErrorResponse errorResponse = {
                    success: false,
                    message: "Failed to retrieve pet",
                    details: "HTTP status: " + response.statusCode.toString()
                };
                return errorResponse;
            }
        } on fail error err {
            log:printError("Error retrieving pet", err);
            ErrorResponse errorResponse = {
                success: false,
                message: "Internal server error",
                details: err.message()
            };
            return errorResponse;
        }
    }

    resource function post pets(@http:Payload Pet newPet) returns ErrorResponse|PetResponse {
        do {
            // Generate ID for new pet if not provided
            Pet petToCreate = newPet;
            if (petToCreate.id is ()) {
                petToCreate.id = uuid:createType1AsString();
            }
            
            // Call external pet store API to create new pet
            http:Response response = check petStoreClient->post("/pet", petToCreate);
            
            if (response.statusCode == 200 || response.statusCode == 201) {
                json petData = check response.getJsonPayload();
                PetResponse successResponse = {
                    success: true,
                    message: "Pet created successfully",
                    data: check petData.cloneWithType(Pet)
                };
                return successResponse;
            } else {
                ErrorResponse errorResponse = {
                    success: false,
                    message: "Failed to create pet",
                    details: "HTTP status: " + response.statusCode.toString()
                };
                return errorResponse;
            }
        } on fail error err {
            log:printError("Error creating pet", err);
            ErrorResponse errorResponse = {
                success: false,
                message: "Internal server error",
                details: err.message()
            };
            return errorResponse;
        }
    }
}
