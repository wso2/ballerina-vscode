import test from "node:test";
import assert from "node:assert/strict";

import { getTypeCompletionSearchText } from "../lib/components/editors/typeCompletionUtils.js";

test("getTypeCompletionSearchText returns full text for a single type", () => {
    assert.equal(getTypeCompletionSearchText("string", 6), "string");
});

test("getTypeCompletionSearchText resets search text after union delimiter", () => {
    assert.equal(getTypeCompletionSearchText("int|", 4), "");
});

test("getTypeCompletionSearchText returns active union member", () => {
    assert.equal(getTypeCompletionSearchText("int|str", 7), "str");
});

test("getTypeCompletionSearchText trims spaces around active union member", () => {
    assert.equal(getTypeCompletionSearchText("int | str", 9), "str");
});

test("getTypeCompletionSearchText returns empty when cursor is immediately after the delimiter", () => {
    assert.equal(getTypeCompletionSearchText("int|string", 4), "");
});

test("getTypeCompletionSearchText returns empty for empty input", () => {
    assert.equal(getTypeCompletionSearchText("", 0), "");
});

test("getTypeCompletionSearchText returns empty when cursor is at start", () => {
    assert.equal(getTypeCompletionSearchText("int", 0), "");
});

test("getTypeCompletionSearchText returns last member of multi-member union", () => {
    assert.equal(getTypeCompletionSearchText("int|float|str", 13), "str");
});

test("getTypeCompletionSearchText returns active prefix when cursor is mid-member", () => {
    assert.equal(getTypeCompletionSearchText("int|string", 7), "str");
});
