public type Meta record {|
    string channel;
    string priorityTag?;
|};

public type OrdersItem record {|
    string orderId;
    string customerId;
    string currency;
    Meta meta;
|};

public type Orders OrdersItem[];

public function main() returns error? {
    OrdersItem ordersItem = {};
    Orders orders = [];
    int i = 0;
    OrdersItem|Orders order1 = [];
}
