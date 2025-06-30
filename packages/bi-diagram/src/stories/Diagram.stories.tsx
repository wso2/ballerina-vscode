import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";

import model1 from "./1-start.json";
import model2 from "./2-action.json";
import model3 from "./3-if.json";
import model4 from "./4-if-else-body.json";
import model5 from "./5-if-then-body.json";
import model6 from "./6-if-body.json";
import model7 from "./7-if-then-body-draft.json";
import model8 from "./8-comment.json";
import model9 from "./9-suggested.json";
import model10 from "./10-suggested-action.json";
import model11 from "./11-suggested-if.json";
import model11_2 from "./11-2-multi-suggesting.json";
import model12 from "./12-if-else-if-empty-4-branch.json";
import model13 from "./13-if-else-if-empty-3-branch.json";
import model14 from "./14-while-basic-body.json";
import model15 from "./15-while-empty-body.json";
import model16 from "./16-foreach-basic-body.json";
import model17 from "./17-foreach-empty-body.json";

export default {
    title: "BI/Diagram",
    component: Diagram,
} as Meta;

const Template: Story<DiagramProps> = (args: JSX.IntrinsicAttributes & DiagramProps) => <Diagram {...args} />;

export const Empty = Template.bind({});
Empty.args = {
    model: { name: "", nodes: [], clients: [] },
};

export const Start = Template.bind({});
Start.args = {
    model: model1,
};

export const Action = Template.bind({});
Action.args = {
    model: model2,
};

export const IfEmpty = Template.bind({});
IfEmpty.args = {
    model: model3,
};

export const IfElseBody = Template.bind({});
IfElseBody.args = {
    model: model4,
};

export const IfThenBody = Template.bind({});
IfThenBody.args = {
    model: model5,
};

export const IfBody = Template.bind({});
IfBody.args = {
    model: model6,
};

export const IfThenBodyDraft = Template.bind({});
IfThenBodyDraft.args = {
    model: model7,
    suggestions: {
        fetching: false,
        onAccept: () => {},
        onDiscard: () => {},
    },
};

export const Comment = Template.bind({});
Comment.args = {
    model: model8,
};

export const Suggested = Template.bind({});
Suggested.args = {
    model: model9,
};

export const SuggestedAction = Template.bind({});
SuggestedAction.args = {
    model: model10,
};

export const SuggestedIf = Template.bind({});
SuggestedIf.args = {
    model: model11,
};

export const SuggestedIfMulti = Template.bind({});
SuggestedIfMulti.args = {
    model: model11_2,
};

export const IfElseIfEmpty4Branch = Template.bind({});
IfElseIfEmpty4Branch.args = {
    model: model12,
};

export const IfElseIfEmpty3Branch = Template.bind({});
IfElseIfEmpty3Branch.args = {
    model: model13,
};

export const WhileBasicBody = Template.bind({});
WhileBasicBody.args = {
    model: model14,
}

export const WhileEmptyBody = Template.bind({});
WhileEmptyBody.args = {
    model: model15,
}

export const ForeachBasicBody = Template.bind({});
ForeachBasicBody.args = {
    model: model16,
}

export const ForeachEmptyBody = Template.bind({});
ForeachEmptyBody.args = {
    model: model17,
}
