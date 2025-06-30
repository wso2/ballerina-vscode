public type Customer record {
    string name;
    string address;
};

public type Order record {
    string date;
    string status;
    Customer customer;
    LineItemOrder[] items;
};

public type LineItemOrder record {
    int id;
};
