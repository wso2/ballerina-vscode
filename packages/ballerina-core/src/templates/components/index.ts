const templates: { [key: string]: string } = {
    CHECKED_PAYLOAD_FUNCTION_INVOCATION: '{{{ TYPE }}} {{{ VARIABLE }}} = check {{{ RESPONSE }}}.{{{ PAYLOAD }}}();',
    DECLARATION: '{{{ TYPE }}} {{{ VARIABLE }}} = {{{CHECK}}} new ({{{ PARAMS }}});',
    DECLARATION_CHECK: '{{{ TYPE }}} {{{ VARIABLE }}} = check new ({{{ PARAMS }}});',
    FOREACH_STATEMENT_CONDITION: '{{{ TYPE }}} {{{ VARIABLE }}} in {{{ COLLECTION }}}',
    FOREACH_STATEMENT: `
foreach {{{ TYPE }}} {{{ VARIABLE }}} in {{{ COLLECTION }}} {

}`,
    FOREACH_STATEMENT_WITH_BLOCK: `
foreach {{{ TYPE }}} {{{ VARIABLE }}} in {{{ COLLECTION }}} {
    {{{ BLOCKSTATEMENTS }}}
}`,
    IF_STATEMENT_CONDITION: '{{{ CONDITION }}}',
    IF_STATEMENT: `
if {{{ CONDITION }}} {

} else {

}`,

    IF_CONDITION: `
if {{{ CONDITION }}} {

`,
    IF_CONDITION_WITH_BLOCK: `
if {{{ CONDITION }}} {
    {{{ BLOCKSTATEMENTS }}}`,
    ELSE_IF_CONDITION: `
} else if {{{ CONDITION }}} {

`,
    ELSE_IF_CONDITION_WITH_BLOCK: `
} else if {{{ CONDITION }}} {
    {{{ BLOCKSTATEMENTS }}}`,
    ELSE_STATEMENT: `
} else {

}`,
    ELSE_STATEMENT_WITH_BLOCK: `
} else {
    {{{ BLOCKSTATEMENTS }}}
}`,
    IMPORT: 'import {{{ TYPE }}};',
    LOG_STATEMENT: 'log:print{{{ TYPE }}}({{{ LOG_EXPR }}});',
    PROPERTY_STATEMENT: '{{{ PROPERTY }}}',
    REMOTE_SERVICE_CALL_CHECK: '{{{ TYPE }}} {{{ VARIABLE }}} = check {{#if WITH_SELF}}self.{{/if}}{{{ CALLER }}}->{{{ FUNCTION }}}({{{ PARAMS }}});',
    REMOTE_SERVICE_CALL: '{{{ TYPE }}} {{{ VARIABLE }}} = {{#if WITH_SELF}}self.{{/if}}{{{ CALLER }}}->{{{ FUNCTION }}}({{{ PARAMS }}});',
    ACTION_STATEMENT: '{{#if WITH_SELF}}self.{{/if}}{{{ CALLER }}}-> {{{ FUNCTION }}}({{{ PARAMS }}});',
    ACTION_STATEMENT_CHECK: 'check {{#if WITH_SELF}}self.{{/if}}{{{ CALLER }}}-> {{{ FUNCTION }}}({{{ PARAMS }}});',
    RESOURCE_SERVICE_CALL_CHECK: '{{{ TYPE }}} {{{ VARIABLE }}} = check {{#if WITH_SELF}}self.{{/if}}{{{ CALLER }}}->/{{#if PATH}}{{{ PATH }}}{{/if}}{{#if FUNCTION}}.{{{ FUNCTION }}}{{/if}}{{#if PARAMS}}({{{ PARAMS }}}){{/if}};',
    RESOURCE_SIGNATURE: '{{{ METHOD }}} {{{ PATH }}}({{{ PARAMETERS }}}) {{#if ADD_RETURN}}returns {{{ADD_RETURN}}}{{/if}}',
    RESOURCE: `
    resource function {{{ METHOD }}} {{{ PATH }}} ({{{ PARAMETERS }}}) {{#if ADD_RETURN}}returns {{{ADD_RETURN}}}{{/if}} {

    }
    `,
    REMOTE_FUNCTION: `
    remote function {{{ PATH }}} ({{{ PARAMETERS }}}) {{#if ADD_RETURN}}returns {{{ADD_RETURN}}}{{/if}} {

    }
    `,
    REMOTE_FUNCTION_SIGNATURE: '{{{ PATH }}}({{{ PARAMETERS }}}) {{#if ADD_RETURN}}returns {{{ADD_RETURN}}}{{/if}}',
    RESPOND_WITH_CHECK: 'check {{{ CALLER }}}->respond({{{ EXPRESSION }}});',
    RESPOND: 'check {{{ CALLER }}}->respond({{{ EXPRESSION }}});',
    RETURN_STATEMENT: 'return {{{ RETURN_EXPR }}};',
    SERVICE_CALL_CHECK: '{{{ TYPE }}} {{{ VARIABLE }}} = check {{{ CALLER }}}.{{{ FUNCTION }}}({{{ PARAMS }}});',
    SERVICE_CALL: '{{{ TYPE }}} {{{ VARIABLE }}} = {{{ CALLER }}}.{{{ FUNCTION }}}({{{ PARAMS }}});',
    WHILE_STATEMENT_CONDITION: '({{{ CONDITION }}})',
    WHILE_STATEMENT: `
while ({{{ CONDITION }}}) {

}`,
    WHILE_STATEMENT_WITH_BLOCK: `
while ({{{ CONDITION }}}) {
    {{{ BLOCKSTATEMENTS }}}
}`,
    WHILE_NEXT_STATEMENT: `
record {|record {} value;|}|error? {{{ VARIABLE }}} = {{{ RETURN_TYPE }}}.next();
while {{{ VARIABLE }}} is record {|record {} value;|} {
    // do something
    {{{ VARIABLE }}} = {{{ RETURN_TYPE }}}.next();
}`,
    SERVICE_AND_LISTENER_DECLARATION: `
listener {{{ SERVICE_TYPE }}}:Listener {{{ LISTENER_NAME }}} = new ({{{ PORT }}});

service {{{ BASE_PATH }}} on {{{ LISTENER_NAME }}} {
    resource function get .() returns error? {
    }
}`,
    SERVICE_DECLARATION_WITH_NEW_INLINE_LISTENER: `
service {{{ BASE_PATH }}} on new {{{ SERVICE_TYPE }}}:Listener({{{ PORT }}}) {
    resource function get .() returns error? {
    }
}`,
    SERVICE_DECLARATION_WITH_SHARED_LISTENER: `
service {{{ BASE_PATH }}} on {{{ LISTENER_NAME }}} {
    resource function get .() returns error? {
    }
}`,
    LISTENER_DECLARATION: `
listener {{{ SERVICE_TYPE }}}:Listener {{{ LISTENER_NAME }}} = new ({{{ PORT }}});
`,
    TRIGGER_LISTENER_DECLARATION: `
listener {{{ SERVICE_TYPE }}}:Listener {{{ LISTENER_NAME }}} = new ({{{ LISTENER_CONFIG }}});
`,
    FUNCTION_DEFINITION: `
{{{ ACCESS_MODIFIER }}} function {{{ NAME }}} ({{{ PARAMETERS }}}) {{{ RETURN_TYPE }}} {{#if IS_EXPRESSION_BODIED}} => {{{ EXPRESSION_BODY }}}; {{else}} {{{ EXPRESSION_BODY }}}
{{/if}}`,
    FUNCTION_DEFINITION_SIGNATURE: `{{{ NAME }}}({{{ PARAMETERS }}}) {{{ RETURN_TYPE }}}`,
    SERVICE_WITH_LISTENER_DECLARATION_UPDATE: `
listener {{{ SERVICE_TYPE }}}:Listener {{{ LISTENER_NAME }}} = new ({{{ PORT }}});

service {{{ BASE_PATH }}} on {{{ LISTENER_NAME }}}`,
    SERVICE_DECLARATION_WITH_INLINE_LISTENER_UPDATE: `
service {{{ BASE_PATH }}} on new {{{ SERVICE_TYPE }}}:Listener({{{ PORT }}})`,
    SERVICE_DECLARATION_WITH_SHARED_LISTENER_UPDATE: `
service {{{ BASE_PATH }}} on {{{ LISTENER_NAME }}}`,
    MODULE_VAR_DECL_WITH_INIT: `
{{{ACCESS_MODIFIER}}} {{{VAR_QUALIFIER}}} {{{VAR_TYPE}}} {{{VAR_NAME}}} = {{{VAR_VALUE}}};`,
    MODULE_VAR_DECL_WITH_INIT_WITHOUT_NEWLINE: `{{{ACCESS_MODIFIER}}} {{{VAR_QUALIFIER}}} {{{VAR_TYPE}}} {{{VAR_NAME}}} = {{{VAR_VALUE}}};`,
    MODULE_VAR_DECL_WITHOUT_INIT: `
{{{ACCESS_MODIFIER}}} {{{VAR_QUALIFIER}}} {{{VAR_TYPE}}} {{{VAR_NAME}}};`,
    CONSTANT_DECLARATION: `
{{{ACCESS_MODIFIER}}} const {{{CONST_TYPE}}} {{{CONST_NAME}}} = {{{CONST_VALUE}}};`,
    MODULE_VAR_DECL_WITH_INIT_WITH_DISPLAY: `@display {
    label: {{{DISPLAY_LABEL}}}
}
{{{ACCESS_MODIFIER}}} {{{VAR_QUALIFIER}}} {{{VAR_TYPE}}} {{{VAR_NAME}}} = {{{VAR_VALUE}}};`,
    TYPE_DEFINITION: `
{{#if ACCESS_MODIFIER }}{{{ ACCESS_MODIFIER }}} {{/if}}type {{{ TYPE_NAME }}} {{{ TYPE_DESCRIPTOR }}}`,
    TRIGGER: `
    {{#if (checkConfigurable listenerParams)}}
        configurable {{triggerType}}:ListenerConfig config = ?;
    {{/if}}

        {{#if httpBased }}listener http:Listener httpListener = new(8090);{{/if}}
    {{#if (checkConfigurable listenerParams)}}
        listener {{triggerType}}:Listener webhookListener =  new({{#if (checkConfigurable listenerParams)}}config{{/if}}{{#if (checkConfigurable listenerParams)}}{{#if httpBased }},{{/if}}{{/if}}{{#if httpBased }}httpListener{{/if}});
    {{/if}}
    {{#if (checkBootstrapServers listenerParams)}}
        listener {{triggerType}}:Listener webhookListener =  new({{triggerType}}:DEFAULT_URL);
    {{/if}}
    {{#each serviceTypes}}
    {{#if (checkConfigurable ../listenerParams)}}
        service {{../triggerType}}:{{ this.name }} on webhookListener {
    {{/if}}
    {{#if (checkBootstrapServers ../listenerParams)}}
        service on webhookListener {
    {{/if}}
    {{#unless (checkConfigurable ../listenerParams)}}
    {{#unless (checkBootstrapServers ../listenerParams)}}
        service {{../triggerType}}:{{ this.name }} on webhookListener {
    {{/unless}}
    {{/unless}}
          {{#each this.functions}}
            remote function {{ this.name }}({{#each this.parameters}}{{#if @index}}, {{/if}}{{#if this.defaultTypeName}}{{this.defaultTypeName}}{{else}}{{../../../triggerType}}:{{this.typeInfo.name}}{{/if}} {{this.name}} {{/each}}) returns error? {
                do {
                    // Not Implemented
                } on fail error e {
                    return e;
                }
            }
          {{/each}}
        }
    {{/each}}

        {{#if httpBased }}service /ignore on httpListener {}{{/if}}`,
    TRIGGER_NEW: `
    listener {{{triggerType}}}:Listener {{{listenerVariableName}}} =  new({{{listenerConfig}}});

    service {{#if basePath}}{{{basePath}}} {{/if}}on {{{listenerVariableName}}} {
            {{#each functions}}
            remote function {{ this.name }}({{#each this.parameters}}{{#if @index}}, {{/if}}{{#if this.defaultTypeName}}{{this.defaultTypeName}}{{else}}{{{../../triggerType}}}:{{this.typeInfo.name}}{{/if}} {{this.name}} {{/each}}) returns error? {
                do {
                    // Not Implemented
                } on fail error e {
                    return e;
                }
            }
            {{/each}}
    }`,
    TRIGGER_UPDATE: `
    service {{{ TRIGGER_CHANNEL }}} on {{{ LISTENER_NAME }}}`,

    ENUM_DEFINITION: `
    {{{ ACCESS_MODIFIER }}} enum {{{ NAME }}} {
        {{#each MEMBERS}}
            {{{ this }}}
        {{/each}}
    }`,
    WORKER_DEFINITION: `
    worker {{{NAME}}} {

    }
    `,
    WORKER_DEFINITION_WITH_RETURN: `
    worker {{{NAME}}} returns {{{RETURN_TYPE}}} {

    }
    `,
    ASYNC_SEND_STATEMENT: `
    {{{EXPRESSION}}} -> {{{TARGET_WORKER}}};
    `,
    ASYNC_RECEIVE_STATEMENT: `
    error|{{{TYPE}}} {{{VAR_NAME}}} = <- {{{SENDER_WORKER}}};
    `,
    WAIT_STATEMENT: `
    {{{TYPE}}} {{{VAR_NAME}}} = wait {{{WORKER_NAME}}};
    `,
    FLUSH_STATEMENT: `
    error? {{{VAR_NAME}}} = flush {{{WORKER_NAME}}};
    `,
    KAFKA: `
service on new kafka:Listener({{{ ENDPOINT }}}) {
    {{#each FUNCTIONS}}
    remote function {{{ NAME }}}({{#each PARAMS}}{{#if @first}}{{/if}}{{{ TYPE }}} {{{ NAME }}}{{#unless @last}}, {{/unless}}{{/each}}) returns error? {
        do {
        } on fail error e {
            return e;
        }
    }
    {{/each}}
}`
};

export default templates;
