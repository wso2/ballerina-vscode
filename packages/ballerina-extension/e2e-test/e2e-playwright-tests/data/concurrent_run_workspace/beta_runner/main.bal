import ballerina/io;
import ballerina/lang.runtime;

// Long-running automation: stays alive while the e2e test starts the other
// integration, proving both run concurrently (#1012).
public function main() {
    io:println("beta_runner started");
    runtime:sleep(300);
}
