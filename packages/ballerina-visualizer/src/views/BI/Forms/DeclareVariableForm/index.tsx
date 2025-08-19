import {
    Form,
    FormProps,
} from "@wso2/ballerina-side-panel";
import { CompletionItem } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";


export const VariableForm = (props: FormProps) => {
    const { handleSelectedTypeChange } = props;
    const [formFields, setFormFields] = useState(props.formFields);

    useEffect(() => {
        setFormFields(props.formFields);
    }, [props.formFields]);

    const handleOnTypeChange = (type: CompletionItem) => {
        updateExpressionValueTypeConstraint(type?.value || '');
        handleSelectedTypeChange(type);
    };

    const updateExpressionValueTypeConstraint = (valueTypeConstraint: string) => {
        const fieldsWithoutExpression = props.formFields.filter((field) => {
            return field.type !== "ACTION_OR_EXPRESSION";
        });
        const expressionField = props.formFields.find((field) => field.type === "ACTION_OR_EXPRESSION");
        if (expressionField) {
            expressionField.valueTypeConstraint = valueTypeConstraint;
        }
        const updatedFields = [...fieldsWithoutExpression, expressionField];
        setFormFields(updatedFields);
    }
    return (
        <>
            <Form {...props}  handleSelectedTypeChange={handleOnTypeChange} formFields={formFields} />
        </>

    );
}