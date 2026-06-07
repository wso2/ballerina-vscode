public function main() {
    
}

type Request record {|
    string id;
    string name;
    string message;
|};

function fn(Request req) returns string {
    string s = string `

User log: ${req.id}
${req.message}
`;
    return s;
}
