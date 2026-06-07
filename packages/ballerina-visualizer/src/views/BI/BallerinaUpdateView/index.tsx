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
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { Button } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";

const Wrapper = styled.div`
  max-width: 660px;
  margin: 80px 120px;
  height: calc(100vh - 160px);
  overflow-y: auto;
`;

const Headline = styled.div`
  font-size: 2.7em;
  font-weight: 400;
  white-space: nowrap;
  margin-bottom: 10px;
`;

const StyledButton = styled(Button)`
  margin-top: 20px;
  width: 100%;
`;

const ButtonContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  height: 28px;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
`;

const StepContainer = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 20px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
`;

const StepDescription = styled.div<{ color?: string }>`
  font-size: 1em;
  line-height: 20px;
  font-weight: 400;
  margin-top: 0;
  margin-bottom: 5px;
  color: ${(props: { color?: string }) => props.color || "inherit"};
`;


const OptionContainer = styled.div`
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
`;

const Option = styled.div`
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.05);
  width: 100%;
  box-sizing: border-box;
  border-left: 3px solid #4a86e8;
`;

const OptionTitle = styled.div`
  font-weight: 500;
  font-size: 1.1em;
  margin-bottom: 8px;
`;

export function BallerinaUpdateView() {
  const { rpcClient } = useRpcContext();

  const [isLoading, setIsLoading] = useState(false);

  const updateBallerina = () => {
    rpcClient.getCommonRpcClient().executeCommand({ commands: ["ballerina.update-ballerina"] });
  };

  const windowClose = () => {
    rpcClient.getCommonRpcClient().executeCommand({ commands: ["workbench.action.closeActiveEditor"] });
  };

  const manageExtensions = async () => {
    setIsLoading(true)
    await rpcClient.getCommonRpcClient().executeCommand({ commands: ["extension.open", "WSO2.ballerina"] });
    setIsLoading(false);
  };

  return (
    <Wrapper>
      <TitleContainer>
        <Headline>Ballerina 2201.12.3 (Swan Lake Update 12)</Headline>
      </TitleContainer>
      <StepContainer>
        <Row>
          <Column>
            <StepDescription>
              We're sorry, but your current ballerina distribution is not compatible with the current version of our VS Code extension. Please consider one of the following options:
            </StepDescription>

            <OptionContainer>
              <Option>
                <OptionTitle>Update to Ballerina 2201.12.3</OptionTitle>
                <StepDescription>
                  Experience the complete suite of visual development tools by updating to the latest version.
                </StepDescription>
                <StyledButton appearance="primary" onClick={updateBallerina}>
                  <ButtonContent>
                    Update Now
                  </ButtonContent>
                </StyledButton>
                <StepDescription style={{ marginTop: 10 }}>
                  <strong>Please restart VS Code after updating the Ballerina distribution.</strong>
                </StepDescription>
              </Option>

              <Option>
                <OptionTitle>Continue in pro-code mode</OptionTitle>
                <StepDescription>
                  Continue working with full pro-code functionality while visualization features are temporarily disabled.
                </StepDescription>
                <StyledButton appearance="secondary" onClick={windowClose}>
                  <ButtonContent>
                    Continue Without Update
                  </ButtonContent>
                </StyledButton>
              </Option>

              <Option>
                <OptionTitle>Use compatible plugin version</OptionTitle>
                <StepDescription>
                  Switch to an older plugin version that's compatible with your current Ballerina distribution.
                </StepDescription>
                <StyledButton disabled={isLoading} appearance="secondary" onClick={manageExtensions}>
                  <ButtonContent>
                    Manage Extension
                  </ButtonContent>
                </StyledButton>
              </Option>
            </OptionContainer>
          </Column>
        </Row>
      </StepContainer>
    </Wrapper>
  );
}
