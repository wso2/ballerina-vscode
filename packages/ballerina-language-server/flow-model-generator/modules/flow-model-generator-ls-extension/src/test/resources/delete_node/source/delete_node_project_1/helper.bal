import ballerina/log;
import ballerina/io;

public function helperFn(int count) {
    log:printWarn(count.toString());
}
