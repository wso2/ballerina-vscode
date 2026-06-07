type L3 record {|
    int l4_1;
    string l4_2;
|};

type L2 record {|
    int l3;
    L3[][] l3Arr;
|};

type L1 record {|
    L2[] l2;
|};

type MyType4 record {|
    L1 l1;
|};

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            L1 l1 = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}