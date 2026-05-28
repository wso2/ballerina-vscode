import ballerina/http;

type RecType record {|
    int i;
|};

type ArrType record {|
    RecType[] rec;
|};

function name(ArrType arr1) returns ArrType => arr1;

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            ArrType v1 = {};
            ArrType v2 = {
                rec: from var recItem in v1.rec
                    select recItem
            };
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
