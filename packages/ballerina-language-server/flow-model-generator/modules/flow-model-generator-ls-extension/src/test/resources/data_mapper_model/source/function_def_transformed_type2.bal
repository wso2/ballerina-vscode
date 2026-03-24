import ballerina/data.xmldata;

public type OrdersItem record {|
    string orderId;
    string customerId;
|};

public type Orders OrdersItem[];

public type CustomerDetails record {|
    Orders orders;
|};

type CreateOrder record {
    string OrderId;
    string CustomerName;
};

type CreateOrders record {
    CreateOrder[] CreateOrder;
};

function transformJsonXml(json customerDetails, json customerDetails1) returns xml|error =>
    let CustomerDetails customerDetailsConverted = check customerDetails.ensureType(), CustomerDetails customerDetailsConverted1 = check customerDetails1.ensureType(),
        CreateOrders transformJsonXml = {CreateOrder: from var ordersItem in customerDetailsConverted.orders select {OrderId: "", CustomerName: ""}} in
        xmldata:toXml(transformJsonXml);

function transformJsonXml1(CustomerDetails customerDetailsConverted) returns CreateOrders|error =>
    let CustomerDetails customerDetails1 = {}, CustomerDetails customerDetails2 = {}
        in {CreateOrder: from var ordersItem in customerDetailsConverted.orders select {OrderId: "", CustomerName: ""}};