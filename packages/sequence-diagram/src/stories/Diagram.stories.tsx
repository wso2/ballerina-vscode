import React from "react";
import { Meta, Story } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";

import functionCall1Model from "./function_call1.json";
import functionCall2Model from "./function_call2.json";
import functionCall3Model from "./function_call3.json";
import ifNode1Model from "./if_node1.json";
import sampleThreeModel from "./if_node4.json";
import ifNode5Model from "./if_node5.json";
import ifNode8Model from "./if_node8.json";
import whileNode1Model from "./while_node1.json";
import endpointCall1Model from "./endpoint_call1.json";

export default {
    title: "Example/Diagram",
    component: Diagram,
} as Meta;

const Template: Story<DiagramProps> = (args: JSX.IntrinsicAttributes & DiagramProps) => <Diagram {...args} />;

export const Empty = Template.bind({});
Empty.args = {
    model: {
        participants: [],
        location: {
            fileName: "empty.bal",
            startLine: { line: 0, offset: 0 },
            endLine: { line: 0, offset: 0 },
        },
    },
};

export const FunctionCall1 = Template.bind({});
FunctionCall1.args = {
    model: functionCall1Model,
    source: `function fn1() returns int {
        int ret2 = fn2();
        int ret3 = fn3(2);
        return ret2 * ret3;
    }
    
    function fn2() returns int {
        int i = fn3(2);
        return 2 + i;
    };
    
    function fn3(int i) returns int => 3;`,
};

export const FunctionCall2 = Template.bind({});
FunctionCall2.args = {
    model: functionCall2Model,
    source: `function fn1() returns int {
        int ret3 = fn3(2);
        int ret2 = fn2();
        return ret2 * ret3;
    }
    
    function fn2() returns int {
        int i = fn3(2);
        return 2 + i;
    };
    
    function fn3(int i) returns int => 3;`,
};

export const FunctionCall3 = Template.bind({});
FunctionCall3.args = {
    model: functionCall3Model,
    source: `function fn1() returns int {
        int ret2 = fn2();
        int ret3 = fn2();
        return ret2 * ret3;
    }
    
    function fn2() returns int {
        int i = fn3(2);
        return 2 + i;
    };
    
    function fn3(int i) returns int => 3;`,
};

export const IfNode1 = Template.bind({});
IfNode1.args = {
    model: ifNode1Model,
    source: `function fn1(boolean flag) {
        if flag {
            int a = fn2();
        } else {
            int b = fn3();
            string c = fn4();
        }
    }
    
    function fn2() returns int => 2;
    
    function fn3() returns int => 3;
    
    function fn4() returns string => "12";`,
};

export const IfNode4 = Template.bind({});
IfNode4.args = {
    model: sampleThreeModel,
    source: `function fn1(boolean flag) {
        if flag {
            int a = fn2();
        } else {
            int b = 12;
        }
    }
    
    function fn2() returns int => 2;
    `,
};

export const IfNode5 = Template.bind({});
IfNode5.args = {
    model: ifNode5Model,
    source: `function fn1(int price) {
        if price > 10 {
            int a = fn2();
        } else if price > 20 {
            int b = 12;
        } else {
            int c = fn2();
        }
    }
    
    function fn2() returns int => 2;
    `,
};

export const IfNode8 = Template.bind({});
IfNode8.args = {
    model: ifNode8Model,
    source: `function fn0(boolean flag) {
        int a = fn1(true);
        string d = fn4();
    }
    
    function fn1(boolean flag) returns int {
        int a = fn2();
        if flag {
            int b = fn2();
        } else {
            int c = fn3();
        }
        return a;
    }
    
    function fn2() returns int => 2;
    
    function fn3() returns int => 3;
    
    function fn4() returns string => "12";    
    `,
};

export const WhileNode1 = Template.bind({});
WhileNode1.args = {
    model: whileNode1Model,
    source: `function fn1() {
        int count = 0;
        while count < 100 {
            int val = fn2(count);
            count += val;
        }
    }
    
    function fn2(int i) returns int => i * 2;`,
};

export const endpointCall1 = Template.bind({});
endpointCall1.args = {
    model: endpointCall1Model,
    source: `import ballerina/http;

    http:Client cl = check new ("http://localhost:9090");
    
    function getCall() returns error? {
        json getRes = check cl->get("/hello");
        http:Response postRes = check cl->post("/hello", "Hello Ballerina", {"Content-Type": "text/plain"});
    }
    `,
};
