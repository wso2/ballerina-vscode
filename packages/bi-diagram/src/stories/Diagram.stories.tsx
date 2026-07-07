import React from "react";
import { Story, Meta } from "@storybook/react/types-6-0";
import { Diagram, DiagramProps } from "../components/Diagram";
import { mergeFlowModelsForDiff } from "../utils/diff";
import { Flow } from "../utils/types";

import model1 from "./1-start.json";
import diffOldModel from "./8-diff-old.json";
import diffNewModel from "./8-diff-new.json";

export default {
    title: "BI/Diagram",
    component: Diagram,
} as Meta;

const Template: Story<DiagramProps> = (args: JSX.IntrinsicAttributes & DiagramProps) => <Diagram {...args} />;

export const Start = Template.bind({});
Start.args = {
    model: model1,
};

// Unified review-diff diagram: old and new versions of the same function merged into one
// flow, with removed nodes in a red lane and added nodes in a green lane.
export const ReviewDiff = Template.bind({});
ReviewDiff.args = {
    model: mergeFlowModelsForDiff(diffOldModel as unknown as Flow, diffNewModel as unknown as Flow),
    readOnly: true,
};
