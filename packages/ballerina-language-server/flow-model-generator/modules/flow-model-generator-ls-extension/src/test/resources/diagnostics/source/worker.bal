public function main() {
    fork {
        worker worker1 {
        }
        worker worker2 {
        }
    }
}
