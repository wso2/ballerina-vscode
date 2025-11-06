import ballerina/http;

public type PurchaseDetails record {
    string rewardId?;
    string skuId?;
    int:Signed32 quantity?;
}

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            PurchaseDetails details = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
