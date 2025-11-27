public type GetOrdersRes record {|
    Product[] products;
|};

public type Bundle record {|
    Product[] products;
|};

public type Product record {|
    Bundle[] bundles;
|};