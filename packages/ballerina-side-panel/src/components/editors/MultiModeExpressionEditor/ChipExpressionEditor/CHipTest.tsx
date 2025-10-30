import React, { useEffect, useState } from "react";

export const ChipTest = () => {
    const [focusState, setFocusState] = useState<{ cursor: number, caretPosition: number }>({ cursor: 0, caretPosition: 2 });
    const spanRefs = [React.createRef<HTMLSpanElement>(), React.createRef<HTMLSpanElement>()];

    const setCaretAtPosition = (element: HTMLSpanElement, position: number) => {
        if (!element) return;

        const selection = window.getSelection();
        const range = document.createRange();

        // Ensure position is within bounds
        const textLength = element.textContent?.length || 0;
        const safePosition = Math.max(0, Math.min(position, textLength));

        try {
            range.setStart(element.firstChild || element, safePosition);
            range.setEnd(element.firstChild || element, safePosition);

            selection?.removeAllRanges();
            selection?.addRange(range);
        } catch (error) {
            console.warn('Could not set caret position:', error);
        }
    };

    function getCaretCharacterOffsetWithin(element) {
        let caretOffset = 0;
        const selection = window.getSelection();

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
        console.log('Caret Offset:', caretOffset);
        return caretOffset;
    }

    const restoreCaret = (el: HTMLSpanElement, index:number) => {
        const offset = focusState[index].caretPosition;
        setCaretAtPosition(el, offset);
    }

    const saveSelection = (el: HTMLSpanElement, index: number) => {
        const caretPos = getCaretCharacterOffsetWithin(el);
        // setFocusState(prev => )
    }

    const handleOnFocus = (element: HTMLSpanElement, index: number) => {
        restoreCaret(element, index);
        // if (!element) return;

        // setFocusState(prev => ({ ...prev, cursor: index }));
        // const caretPos = getCaretCharacterOffsetWithin(element);
        // setFocusState(prev => ({ ...prev, caretPosition: caretPos }));
    }

    // useEffect(() => {
    //     if (spanRefs[focusState.cursor]?.current) {
    //         spanRefs[focusState.cursor].current.focus();
    //         setCaretAtPosition(focusState.caretPosition);
    //     }
    // }, [focusState.cursor, focusState.caretPosition]);

    return (
        <div
            style={{
                width: "100%",
                backgroundColor: 'red',
                height: "200px"
            }}>
            <div>
                <span style={{ marginLeft: '10px' }}>Current Cursor: {focusState.cursor}</span>
                <span style={{ marginLeft: '10px' }}>Caret Position: {focusState.caretPosition}</span>

            </div>
            <span
                ref={spanRefs[0]}
                contentEditable={true}
                onFocus={(e) => {
                    handleOnFocus(e.target,0);
                }}
                style={{
                    width: '200px',
                    height: '100px',
                    backgroundColor: 'green'
                }}
            >
                qawfwfawf
            </span>
            <span
                ref={spanRefs[1]}
                contentEditable={true}
                onFocus={(e) => {
                    handleOnFocus(e.target, 1);
                }}
                
                style={{
                    width: '200px',
                    height: '100px',
                    backgroundColor: 'green'
                }}
            >
                awdawdawd
            </span>
        </div>

    );
}