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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */

import React, { memo, useState } from "react";
import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";

const AccordionItemContainer = styled.div`
  margin-bottom: 10px;
  padding-bottom: 8px;
`;

const AccordionTitleButton = styled.button<{ isEditing: boolean }>`
  cursor: pointer;
  width: 100%;
  border: none;
  text-align: left;
  outline: none;
  transition: background-color 0.6s ease;
  position: relative;
  background-color: var(--vscode-list-hoverBackground);

  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;

  &:hover {
    background-color: ${({ isEditing }: {isEditing: boolean}) =>
      isEditing
        ? "var(--vscode-list-hoverBackground)" // no hover if editing
        : "var(--vscode-badge-background)"};
    cursor: ${({ isEditing }: {isEditing: boolean}) => (isEditing ? "default" : "pointer")};
  }

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: var(--vscode-button-background);
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

/**
 * Matches AccordionTitleText styling (font-size, weight, color, line-height)
 * Removes borders so it looks like plain text.
 */
const TitleInput = styled.input`
  flex: 1;
  margin-right: 16px;

  /* Use the same font styles as read-mode text */
  color: var(--vscode-editor-foreground);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;

  /* Eliminate default input styling */
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  margin: 0;

  &:focus {
    outline: none;
    box-shadow: none;
  }
`;

const EditButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const AccordionContent = styled.div<{ expanded: boolean }>`
  position: relative;
  background-color: var(--vscode-editor-background);
  overflow: hidden;
  transition: max-height 0.4s ease;
  max-height: ${({ expanded }: {expanded: boolean}) => (expanded ? "500px" : "0")};

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--vscode-button-background);
    display: ${({ expanded }: {expanded: boolean}) => (expanded ? "block" : "none")};
  }
`;

/** 
 * Original read-mode styling 
 * for the title
 */
const AccordionTitleText = styled.p`
  margin: 0;
  padding: 0;
  color: var(--vscode-editor-foreground);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
`;

/** 
 * Matches AccordionText style, 
 * but used when editing 
 */
const AccordionTextarea = styled.textarea`
  /* If you want the text in the same spot as read-mode, 
     copy the same padding from AccordionText */
  padding: 8px;
  padding-left: 16px;
  margin: 0;

  /* Match color, font, etc. so it looks the same */
  color: var(--vscode-editor-foreground);
  background: transparent;
  font-size: 12px;
  line-height: 1.2;
  font-weight: normal;
  white-space: pre-wrap;

  /* Remove the default borders/outlines */
  border: none;
  outline: none;
  box-shadow: none;

  width: 100%;
  min-height: 80px;
  resize: none; /* optional: to prevent user from resizing the textarea */

  &:focus {
    outline: none;
    box-shadow: none;
  }
`;

const AccordionText = styled.p`
  padding: 8px;
  padding-left: 16px;
  margin: 0;
  white-space: pre-wrap;
  color: var(--vscode-editor-foreground);
`;

interface AccordionItemProps {
  content: string;
  onDelete: (content: string) => void;
  onEdit: (oldContent: string, newContent: string) => void;
  isEnabled: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = memo(
  ({ content, onDelete, onEdit, isEnabled }) => {
    // 1) Parse initial title & description from `content`
    const parseContent = (input: string) => {
      const titleMatch = input.match(/<title>(.*?)<\/title>/);
      const descriptionMatch = input.match(/<description>([\s\S]*?)<\/description>/);

      const title = titleMatch ? titleMatch[1].trim() : "Untitled";
      const description = descriptionMatch ? descriptionMatch[1].trim() : "No description available.";

      return { title, description };
    };

    const { title, description } = parseContent(content);

    // 2) Local states
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [localTitle, setLocalTitle] = useState(title);
    const [localDescription, setLocalDescription] = useState(description);

    // 3) Toggle for expansion (disabled if editing)
    const handleToggle = () => {
      if (!isEditing) {
        setIsExpanded((prev) => !prev);
      }
    };

    // 4) Delete
    const handleDelete = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      onDelete(content);
    };

    // 5) Start editing (forces expanded)
    const handleEditClick = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setIsEditing(true);
      setIsExpanded(true);
    };

    // 6) Save changes
    const handleSave = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setIsEditing(false);

      // Reconstruct updated content
      const updatedContent = `<title>${localTitle}</title>\n<description>${localDescription}</description>`;
      onEdit(content, updatedContent);
    };

    // 7) Cancel editing
    const handleCancel = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setIsEditing(false);
      setLocalTitle(title);
      setLocalDescription(description);
    };

    // 8) Final expansion state
    const finalExpanded = isEditing || isExpanded;

    return (
      <AccordionItemContainer>
        <AccordionTitleButton
          onClick={handleToggle}
          aria-expanded={finalExpanded}
          isEditing={isEditing}
        >
          <TitleSection>
            {isEditing ? (
              <TitleInput
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
              />
            ) : (
              <AccordionTitleText>{localTitle}</AccordionTitleText>
            )}
          </TitleSection>

          <EditButtonsContainer>
            {/* Edit button (only if not editing) */}
            {isEnabled && !isEditing && (
              <Codicon
                onClick={handleEditClick}
                iconSx={{ color: "var(--vscode-input-foreground)" }}
                name="edit"
              />
            )}

            {/* Save/Cancel (only if editing) */}
            {isEnabled && isEditing && (
              <>
                <Codicon
                  onClick={handleSave}
                  iconSx={{ color: "var(--vscode-input-foreground)" }}
                  name="check"
                />
                <Codicon
                  onClick={handleCancel}
                  iconSx={{ color: "var(--vscode-errorForeground)" }}
                  name="chrome-close"
                />
              </>
            )}

            {/* Delete (hide if editing) */}
            {isEnabled && !isEditing && (
              <Codicon
                onClick={handleDelete}
                iconSx={{ color: "var(--vscode-errorForeground)" }}
                name="trash"
              />
            )}
          </EditButtonsContainer>
        </AccordionTitleButton>

        <AccordionContent expanded={finalExpanded}>
          {finalExpanded && (
            <>
              {isEditing ? (
                <AccordionTextarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                />
              ) : (
                <AccordionText>{localDescription}</AccordionText>
              )}
            </>
          )}
        </AccordionContent>
      </AccordionItemContainer>
    );
  }
);

export default AccordionItem;
