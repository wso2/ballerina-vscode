type FileSystem record {|
    string name;
    string 'type;
|};

FileSystem fs1 = {};
FileSystem fs2 = {name: fs1.'type};
