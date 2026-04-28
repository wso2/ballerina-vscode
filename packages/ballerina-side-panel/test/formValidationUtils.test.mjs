import test from "node:test";
import assert from "node:assert/strict";

import { shouldRunExternalFormValidation } from "../lib/components/Form/utils.js";

test("shouldRunExternalFormValidation blocks external validation when local form state is invalid", () => {
    assert.equal(
        shouldRunExternalFormValidation({
            formStateIsValid: false,
            errors: {
                name: {
                    type: "required",
                    message: "Name is required",
                },
            },
        }),
        false
    );
});

test("shouldRunExternalFormValidation blocks external validation when local errors exist", () => {
    assert.equal(
        shouldRunExternalFormValidation({
            formStateIsValid: true,
            errors: {
                path: {
                    type: "pattern",
                    message: "Invalid path",
                },
            },
        }),
        false
    );
});

test("shouldRunExternalFormValidation permits external validation when local validation is clean", () => {
    assert.equal(
        shouldRunExternalFormValidation({
            formStateIsValid: true,
            errors: {},
        }),
        true
    );
});
