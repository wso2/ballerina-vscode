import test/projB;

public function main() {
    // This will cause an error when getMessage is non-public
    string msg = projB:getMessage();
}
