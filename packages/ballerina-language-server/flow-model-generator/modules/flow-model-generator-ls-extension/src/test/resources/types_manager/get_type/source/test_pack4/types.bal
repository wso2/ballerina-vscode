import ballerina/data.jsondata;
import ballerina/data.xmldata;

type ModuleInfo record {|
    int __id;
    string _namespace;
    record {|
        string _uri;
        record {|
            string _moduleName;
            string __uuid;
        |} _moduleInfo;
    |} _module;
|};

type UrlInfo record {|
    string protocol;
    string host;
    int port?;
    string path;
|};

const annotation ModuleInfo Module on type;
const annotation UrlInfo Url on type;

@Url {
    protocol: "Protocol",
    host: "localhost",
    path: "http://example.com/url"
}
@Module {
    __id: 12,
    _namespace: "http://example.com/gen",
    _module: {
        _uri: "http://example.com/gen",
        _moduleInfo: {
            _moduleName: "types",
            __uuid: "123e4567-e89b-12d3-a456-426614174000"
        }
    }
}
@xmldata:Namespace {
    uri: "http://example.com/xmlpath"
}
type Person record {
    string Name;
    @xmldata:Attribute
    string uuid;
};

type School record {
    @jsondata:Name {
        value: "_name"
    }
    string Name;

    @jsondata:Name {
        value: "$state"
    }
    string state;
};


