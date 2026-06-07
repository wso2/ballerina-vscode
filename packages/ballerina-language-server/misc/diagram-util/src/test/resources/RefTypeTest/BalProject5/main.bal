public type Outer record {|
    Inner1[] products;
|};

public type Inner2 record {|
    Inner1[] products;
|};

public type Inner1 record {|
    Inner2[] bundles;
|};