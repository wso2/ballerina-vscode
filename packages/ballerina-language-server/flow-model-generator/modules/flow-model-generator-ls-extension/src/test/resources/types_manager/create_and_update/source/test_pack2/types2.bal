import ballerina/data.xmldata;

@xmldata:Namespace {
    uri: "http://example.com/xmlpath"
}
type Student record {
    string Name;
    @xmldata:Attribute
    string uuid;
};