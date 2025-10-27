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

import { AutoResizeTextArea, Codicon, TextArea, ThemeColors } from "@wso2/ui-toolkit"
import styled from "@emotion/styled";
import { useState } from "react";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`

const PromptBox = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: space-between;
    align-items: center;
    position: relative;
`

const GenerateButton = styled.button`
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 100%;
    background-color: ${ThemeColors.PRIMARY};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    position: absolute;
    right: 10px;
    top: 0;
    height: 100%;
`

export const GenerateBICopilot = () => {

    const [prompt, setPrompt] = useState('');
    const [generatedText, setGeneratedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const getGeneratedText = async () => {
        return new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve("This is the generated text you got!");
            }, 1000);
        });
    }

    const handlePromptChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(event?.target?.value || '');
    }

    const handleGenerate = async () => {
        setGeneratedText('');
        setIsLoading(true);
        const generatedText = await getGeneratedText();

        let i = 0;
        function animate() {
            setGeneratedText(generatedText.slice(0, i));
            i++;
            if (i <= generatedText.length) {
                setTimeout(animate, 10);
            } else {
                setIsLoading(false);
                setPrompt('');
            }
        }
        animate();
    };

    return (
        <Container>
            <PromptBox >
                <TextArea value={prompt} onChange={handlePromptChange} sx={{width: '100%'}} placeholder="What do you want this expression to do?" rows={2}/>                
                <ButtonContainer>
                    <GenerateButton disabled={isLoading} onClick={handleGenerate}>
                        {isLoading ?<Codicon sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}} name="close" />
                         : <Codicon sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}} name="arrow-up" />}
                    </GenerateButton>
                </ButtonContainer>
            </PromptBox>
            <TextArea value={generatedText} placeholder="Generated Expression will be shown here" rows={15}/>
        </Container>
    )
}
