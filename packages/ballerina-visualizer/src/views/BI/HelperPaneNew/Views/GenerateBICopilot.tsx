import { AutoResizeTextArea, Button, Codicon, TextArea, ThemeColors } from "@wso2/ui-toolkit"
import { TextField } from "@wso2/ui-toolkit/lib/components/TextField/TextField"
import styled from "@emotion/styled";
import { useState, useCallback } from "react";
import debounce from "lodash/debounce";

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

const StyledTextArea = styled(AutoResizeTextArea)`
    ::part(control) {
        font-family: monospace;
        font-size: 12px;
        min-height: 20px;
        padding: 5px 8px;
    }
`;

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