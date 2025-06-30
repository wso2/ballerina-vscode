import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";

import modelS1 from "./s1-currency-convert.json";
import modelS2 from "./s2-multi-if-draft.json";
import modelS3 from "./s2-multi-if-with-draft.json";
import modelS4 from "./s2-multi-if-with-draft-with-existing-viewstates.json";

export default {
    title: "BI/Samples",
    component: Diagram,
} as Meta;

const Template: Story<DiagramProps> = (args: JSX.IntrinsicAttributes & DiagramProps) => <Diagram {...args} />;

export const Currency = Template.bind({});
Currency.args = {
    model: modelS1,
};

export const MultiIfDraft = Template.bind({});
MultiIfDraft.args = {
    model: modelS2,
};

export const MultiIfWithDraft = Template.bind({});
MultiIfWithDraft.args = {
    model: modelS3,
};

export const MultiIfWithDraftWithExistingViewStates = Template.bind({});
MultiIfWithDraftWithExistingViewStates.args = {
    model: modelS4,
};
