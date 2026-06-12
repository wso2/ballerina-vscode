import ballerina/io;
import ballerina/lang.runtime;

// Long-running automation (pre-baked in the template, per the e2e-writer
// rule that scenarios must not modify Ballerina sources at runtime): stays
// alive while the suite triggers conflicting runs.
public function main() {
    io:println("run-conflict automation started");
    runtime:sleep(300);
}
