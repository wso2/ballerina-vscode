import test from "node:test";
import assert from "node:assert/strict";

import { hasIncompleteRequiredFormFields, shouldRunExternalFormValidation } from "../lib/components/Form/utils.js";

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

test("shouldRunExternalFormValidation blocks external validation when required fields are incomplete", () => {
    assert.equal(
        shouldRunExternalFormValidation({
            formStateIsValid: true,
            errors: {},
            hasIncompleteRequiredFields: true,
        }),
        false
    );
});

test("hasIncompleteRequiredFormFields returns true when a required string field is empty", () => {
    assert.equal(
        hasIncompleteRequiredFormFields(
            [
                {
                    key: "variable",
                    optional: false,
                    hidden: false,
                    enabled: true,
                },
            ],
            { variable: "" }
        ),
        true
    );
});

test("hasIncompleteRequiredFormFields returns true when a required string field is whitespace", () => {
    assert.equal(
        hasIncompleteRequiredFormFields(
            [
                {
                    key: "expression",
                    optional: false,
                    hidden: false,
                    enabled: true,
                },
            ],
            { expression: "   " }
        ),
        true
    );
});

test("hasIncompleteRequiredFormFields returns true when a required array field is empty", () => {
    assert.equal(
        hasIncompleteRequiredFormFields(
            [
                {
                    key: "items",
                    optional: false,
                    hidden: false,
                    enabled: true,
                },
            ],
            { items: [] }
        ),
        true
    );
});

test("hasIncompleteRequiredFormFields ignores optional, hidden, and disabled empty fields", () => {
    assert.equal(
        hasIncompleteRequiredFormFields(
            [
                {
                    key: "optionalValue",
                    optional: true,
                    hidden: false,
                    enabled: true,
                },
                {
                    key: "hiddenValue",
                    optional: false,
                    hidden: true,
                    enabled: true,
                },
                {
                    key: "disabledValue",
                    optional: false,
                    hidden: false,
                    enabled: false,
                },
            ],
            {
                optionalValue: "",
                hiddenValue: "",
                disabledValue: "",
            }
        ),
        false
    );
});

test("hasIncompleteRequiredFormFields returns false when required visible fields are filled", () => {
    assert.equal(
        hasIncompleteRequiredFormFields(
            [
                {
                    key: "variable",
                    optional: false,
                    hidden: false,
                    enabled: true,
                },
            ],
            { variable: "var1" }
        ),
        false
    );
});
