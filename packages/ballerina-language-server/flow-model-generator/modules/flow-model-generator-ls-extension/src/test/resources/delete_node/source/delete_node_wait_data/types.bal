type WfInput record {
    string id;
};

type WfData1 record {|
    future<boolean> a;
    future<string> b;
|};

type WfData2 record {|
    future<boolean> a;
    future<string> b;
|};

type WfData3 record {|
    future<boolean> a;
|};
