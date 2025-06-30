
import styled from "@emotion/styled";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";
import React from "react";

export interface RecordButtonGroupProps {
  openRecordEditor: () => void;
  showTypeList: () => void;
}

export function RecordButtonGroup(props: RecordButtonGroupProps) {
  const { openRecordEditor, showTypeList } = props;

  return (
    <Container>
      <Button
        onClick={openRecordEditor}
        appearance="icon"
        data-testid='new-record'
      >
        <Codicon name="add" sx={{ marginRight: "4px" }} iconSx={{ color: "var(--vscode-focusBorder)" }} />
        <Typography variant="body3" sx={{ color: "var(--vscode-focusBorder)" }}>NEW RECORD</Typography>
      </Button>
      <Typography variant="body1">OR</Typography>
      <Button
        onClick={showTypeList}
        appearance="icon"
        data-testid='exiting-record'
      >
        <Codicon name="add" sx={{ marginRight: "4px" }} iconSx={{ color: "var(--vscode-focusBorder)" }} />
        <Typography variant="body3" sx={{ color: "var(--vscode-focusBorder)" }}>EXISTING RECORD</Typography>
      </Button>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;