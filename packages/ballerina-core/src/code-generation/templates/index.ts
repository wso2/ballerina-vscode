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

export default {
    ASYNC_SEND_ACTION : `{{{EXPRESSION}}} -> {{{TARGET_WORKER}}};
    `,
    ASYNC_RECEIVE_ACTION : `{{{TYPE}}} {{{VAR_NAME}}} = check <- {{{SENDER_WORKER}}};
    `,
    CODE_BLOCK_NODE :
    `worker {{{NODE_NAME}}} returns error? {
        {{#if INPUT_PORTS}}
        {{{INPUT_PORTS}}}
        {{/if}}
        {{#if CODE_BLOCK}}
        {{{CODE_BLOCK}}}
        {{/if}}
        {{#if OUTPUT_PORTS}}
        {{{OUTPUT_PORTS}}}
        {{/if}}
    }`,
    ANNOTATION:
    `@display {
        label: "{{{NODE}}}",
        templateId: "{{{TEMPLATE_ID}}}",
        xCord: {{{X_CODE}}},
        yCord: {{{Y_CODE}}}{{#if METADATA}},
        metadata: "{{{METADATA}}}"
        {{/if}}
    }`,
    SWITCH_NODE : 
    `worker {{{NODE_NAME}}} returns error? {
        {{#if INPUT_PORTS}}
        {{{INPUT_PORTS}}}
        {{/if}}
        {{#if CODE_BLOCK}}
        {{{CODE_BLOCK}}}
        {{/if}}
        {{{SWITCH_BLOCK}}}
    }`,
    IF_BLOCK : `
    if ({{{CONDITION}}}) {
        {{{OUTPORTS}}}
    } `,
    ELSE_BLOCK : 
    `else {
        {{{OUTPORTS}}}
    } `,
    ELSEIF_BLOCK : 
    `else if ({{{CONDITION}}}) {
        {{{OUTPORTS}}}
    } `,
    CALLER_ACTION : `{{{ TYPE }}} {{{ VARIABLE }}} = check {{{ CALLER }}}->{{{ACTION}}}("{{{ PATH }}}" {{#if PAYLOAD}} ,{{{PAYLOAD}}} {{/if}});
    `,
    CALLER_BLOCK: 
    `worker {{{NODE_NAME}}} returns error? {
        {{#if INPUT_PORTS}}
        {{{INPUT_PORTS}}}
        {{/if}}
        {{#if CALLER_ACTION}}
        {{{CALLER_ACTION}}}
        {{/if}}
        {{#if OUTPUT_PORTS}}
        {{{OUTPUT_PORTS}}}
        {{/if}}
    }`,
    RESPOND:
    `worker {{{NODE_NAME}}} returns error? {
        {{#if INPUT_PORTS}}
        {{{INPUT_PORTS}}}
        {{{VAR_NAME}}} -> function;
        {{/if}}
    }`,
    TRANSFORM_NODE:
    `worker {{{NODE_NAME}}} returns error? {
        {{#if INPUT_PORTS}}
        {{{INPUT_PORTS}}}
        {{/if}}
        {{#if TRANSFORM_FUNCTION}}
        {{{TRANSFORM_FUNCTION}}}
        {{/if}}
        {{#if OUTPUT_PORTS}}
        {{{OUTPUT_PORTS}}}
        {{/if}}
    }`,
    RETURN_BLOCK:`
    {{#if VAR_NAME}}
    {{{TYPE}}} {{{VAR_NAME}}} = check <- {{{NODE_NAME}}};
    return {{{VAR_NAME}}};
    {{/if}}
    `,
    TRANSFORM_FUNCTION:
    `
    function {{{FUNCTION_NAME}}}({{{PARAMETERS}}}) {{{FUNCTION_RETURN}}} => ();
    `,
    START_NODE:
    `worker StartNode returns error? {
        _ = <- function;
        {{#if OUTPUT_PORTS}}
        {{{OUTPUT_PORTS}}}
        {{/if}}
    }`,
    FUNCTION_RETURN:
    `returns {{{TYPE}}}|error`,
    TRANSFORM_FUNCTION_CALL:`
    {{{TYPE}}} {{{VAR_NAME}}} = check {{{FUNCTION_NAME}}}({{{PARAMETERS}}});`,
    UNION_EXPRESSION:
    `{{#each UNION_FIELDS}}{{this}}{{#unless @last}} | {{/unless}}{{/each}}`,
    TRANSFORM_FUNCTION_WITH_BODY:
    `
    function {{{FUNCTION_NAME}}}({{{PARAMETERS}}}) {{{FUNCTION_RETURN}}} {{{FUNCTION_BODY}}}
    `,

}
