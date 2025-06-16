public function main() returns error? {
    fork {
        worker worker1 returns int {
            return 10;
        }
        worker worker2 {
        }
    }
    map<any|error> waitResult = wait {worker1, worker2};
}
