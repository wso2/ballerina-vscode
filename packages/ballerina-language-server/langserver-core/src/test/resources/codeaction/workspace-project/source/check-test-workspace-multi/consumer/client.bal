import lstest/provider;

public function main() {
    json data = provider:fetch();
    io:println(data);
}
