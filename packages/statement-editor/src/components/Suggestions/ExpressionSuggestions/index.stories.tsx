/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';

// tslint:disable-next-line: no-submodule-imports
import { Story } from '@storybook/react/types-6-0';

import { SuggestionItem } from "../../../models/definitions";
import varDeclBinaryExprModel from "../../StatementRenderer/data/local-var-decl-with-binary-expr-st-model.json";

import { ExpressionSuggestions } from "./index";

export default {
    title: 'Low Code Editor/Testing/StatementEditor/ExpressionSuggestions',
    component: ExpressionSuggestions,
};

const Template: Story = () => <ExpressionSuggestions />;

const expressionSuggestions: SuggestionItem[] = [{ value: "StringLiteral" },
    { value: "Conditional" },
    { value: "StringTemplate" },
    { value: "Arithmetic" }]

const operatorSuggestions: SuggestionItem[] = [{ value: "+", kind: "PlusToken" },
    { value: "-", kind: "MinusToken" },
    { value: "*", kind: "AsteriskToken" },
    { value: "/", kind: "SlashToken" },
    { value: "%", kind: "PercentToken" }]

export const ExpressionSuggestionDefault = Template.bind({});

ExpressionSuggestionDefault.args = {
    model: varDeclBinaryExprModel,
    suggestions: expressionSuggestions,
    operator: false,
    suggestionHandler: ("")
};

export const OperatorSuggestion = Template.bind({});

OperatorSuggestion.args = {
    model: varDeclBinaryExprModel,
    suggestions: operatorSuggestions,
    operator: true,
    suggestionHandler: ("")
};
