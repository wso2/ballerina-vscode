/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { AddSkillRequest, SkillEntry, SkillTier } from "@wso2/ballerina-core";

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1999;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Dialog = styled.div`
    z-index: 2000;
    width: 480px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-family: var(--vscode-font-family);
    font-size: 13px;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const Title = styled.h2`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const SegmentedBar = styled.div`
    display: flex;
    margin: 12px 16px 0;
    background: var(--vscode-editor-background, var(--vscode-sideBar-background));
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
`;

const SegmentedTab = styled.button<{ active: boolean }>`
    flex: 1;
    background: ${(p: { active: boolean }) =>
        p.active
            ? "var(--vscode-editorWidget-background, var(--vscode-editor-background))"
            : "transparent"};
    border: ${(p: { active: boolean }) =>
        p.active
            ? "1px solid var(--vscode-widget-border, var(--vscode-panel-border))"
            : "1px solid transparent"};
    box-shadow: ${(p: { active: boolean }) => p.active ? "0 1px 3px rgba(0,0,0,0.15)" : "none"};
    color: ${(p: { active: boolean }) =>
        p.active ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)"};
    font-weight: ${(p: { active: boolean }) => p.active ? 600 : 400};
    font-size: 12px;
    font-family: var(--vscode-font-family);
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.1s, color 0.1s;

    &:hover:not([aria-selected="true"]) {
        color: var(--vscode-foreground);
    }
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
`;

const TabRow = styled.div`
    display: flex;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const Tab = styled.button<{ active: boolean }>`
    background: transparent;
    border: none;
    color: ${(p: { active: boolean }) => p.active ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)"};
    font-weight: ${(p: { active: boolean }) => p.active ? 600 : 400};
    font-size: 12px;
    font-family: var(--vscode-font-family);
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 2px solid ${(p: { active: boolean }) => p.active ? "var(--vscode-focusBorder, var(--vscode-button-background))" : "transparent"};
    margin-bottom: -1px;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const Input = styled.input<{ readOnly?: boolean }>`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, var(--vscode-panel-border)));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    width: 100%;
    box-sizing: border-box;
    opacity: ${(p: { readOnly?: boolean }) => p.readOnly ? 0.7 : 1};

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
    }
`;

const Textarea = styled.textarea`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border, var(--vscode-panel-border)));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    width: 100%;
    box-sizing: border-box;
    min-height: 64px;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
    }
`;

const Hint = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const FieldError = styled.div`
    font-size: 11px;
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    margin-top: 2px;
`;

const Banner = styled.div`
    background: var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.1));
    color: var(--vscode-errorForeground);
    border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
    border-radius: 3px;
    padding: 6px 8px;
    font-size: 11px;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const BaseButton = styled.button`
    border-radius: 3px;
    padding: 4px 12px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    min-width: 64px;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const PrimaryButton = styled(BaseButton)`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 1px solid var(--vscode-button-background);

    &:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground, var(--vscode-button-background));
    }
`;

const SecondaryButton = styled(BaseButton)`
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: 1px solid var(--vscode-button-border, var(--vscode-widget-border, var(--vscode-panel-border)));

    &:hover:not(:disabled) {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
    }
`;

const DropZone = styled.div<{ active: boolean }>`
    border: 2px dashed ${(p: { active: boolean }) =>
        p.active
            ? "var(--vscode-focusBorder, var(--vscode-button-background))"
            : "var(--vscode-widget-border, var(--vscode-panel-border))"};
    border-radius: 8px;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 20px 16px;
    cursor: pointer;
    background: ${(p: { active: boolean }) =>
        p.active ? "var(--vscode-list-hoverBackground)" : "transparent"};
    transition: border-color 0.15s, background 0.15s;

    &:hover {
        border-color: var(--vscode-focusBorder, var(--vscode-button-background));
        background: var(--vscode-list-hoverBackground);
    }
`;

const DropZoneIcon = styled.span`
    font-size: 22px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
`;

const DropZonePrimary = styled.div`
    font-size: 13px;
    color: var(--vscode-foreground);
    text-align: center;

    em {
        font-style: normal;
        color: var(--vscode-textLink-foreground, var(--vscode-button-background));
        font-weight: 500;
    }
`;

const DropZoneSubtext = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
`;

function parseSkillMdInBrowser(raw: string): { name: string; trigger: string; body?: string } | null {
    if (!raw.trimStart().startsWith('---')) { return null; }
    const start = raw.indexOf('---');
    const end = raw.indexOf('---', start + 3);
    if (end === -1) { return null; }
    const fm = raw.slice(start + 3, end);
    const name    = /^name:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? '';
    const trigger = /^description:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? '';
    const body    = raw.slice(end + 3).trim();
    if (!name || !trigger) { return null; }
    return { name, trigger, body: body && body !== trigger ? body : undefined };
}

interface Props {
    isOpen: boolean;
    editSkill?: SkillEntry;
    skills: SkillEntry[];
    onSubmit: (req: AddSkillRequest) => Promise<void>;
    onClose: () => void;
}

export const AddSkillModal: React.FC<Props> = ({ isOpen, editSkill, skills, onSubmit, onClose }) => {
    const { rpcClient } = useRpcContext();
    const isEdit = !!editSkill;

    // create-mode state
    const [mode, setMode] = useState<"create" | "import">("create");
    const [tier, setTier] = useState<SkillTier.PROJECT | SkillTier.USER>(SkillTier.PROJECT);
    const [name, setName] = useState('');
    const [trigger, setTrigger] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // import-mode state
    const [parsedSkill, setParsedSkill] = useState<{ name: string; trigger: string; body?: string } | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setMode("create");
            setTier(SkillTier.PROJECT);
            setName('');
            setTrigger('');
            setBody('');
            setSubmitting(false);
            setSubmitError(null);
            setParsedSkill(null);
            setImportError(null);
            setParsing(false);
            setIsDragOver(false);
            return;
        }
        if (editSkill) {
            const rawName = editSkill.name;
            const plainName = rawName.includes('/') ? rawName.split('/').pop()! : rawName;
            setTier(editSkill.tier as SkillTier.PROJECT | SkillTier.USER);
            setName(plainName);
            setTrigger(editSkill.trigger);
            setBody(editSkill.body ?? '');
            setSubmitError(null);
        }
    }, [isOpen, editSkill]);

    if (!isOpen) return null;

    const bareNameOf = (fullName: string) =>
        fullName.includes('/') ? fullName.split('/').pop()! : fullName;

    const findDuplicateSkill = (bareName: string): SkillEntry | null => {
        if (isEdit || !bareName) { return null; }
        return skills.find(s =>
            bareNameOf(s.name).toLowerCase() === bareName.toLowerCase()
        ) ?? null;
    };

    const duplicateMessage = (dup: SkillEntry, skillName: string): string => {
        switch (dup.tier) {
            case SkillTier.BUILTIN:
                return `"${skillName}" is already a built-in skill. Please rename it.`;
            case SkillTier.USER:
                return `A user skill named "${skillName}" already exists. Please rename it.`;
            case SkillTier.PROJECT:
            default:
                return `A project skill named "${skillName}" already exists. Please rename it.`;
        }
    };

    const createDuplicate = findDuplicateSkill(name.trim());
    const importDuplicate = parsedSkill ? findDuplicateSkill(parsedSkill.name) : null;

    const canSubmitCreate = !submitting && name.trim() !== '' && trigger.trim() !== '' && !createDuplicate;
    const canSubmitImport = !submitting && !parsing && parsedSkill !== null && !importDuplicate;
    const canSubmit = mode === "create" ? canSubmitCreate : canSubmitImport;

    const processFile = async (file: File) => {
        setParsedSkill(null);
        setImportError(null);
        setParsing(true);

        try {
            const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

            if (ext === '.md') {
                const text = await new Promise<string>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result as string);
                    reader.onerror = rej;
                    reader.readAsText(file);
                });
                const parsed = parseSkillMdInBrowser(text);
                if (!parsed) {
                    setImportError('Missing name or description in YAML front matter.');
                } else {
                    setParsedSkill(parsed);
                }
            } else if (ext === '.zip' || ext === '.skill') {
                const dataUrl = await new Promise<string>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result as string);
                    reader.onerror = rej;
                    reader.readAsDataURL(file);
                });
                const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
                const resp = await rpcClient.getAiPanelRpcClient().parseSkillFile({
                    fileName: file.name,
                    fileContent: base64,
                });
                if (resp.error) {
                    setImportError(resp.error);
                } else if (resp.name && resp.trigger) {
                    setParsedSkill({ name: resp.name, trigger: resp.trigger, body: resp.body });
                } else {
                    setImportError('Failed to parse skill file.');
                }
            } else {
                setImportError('Unsupported file type. Drop a .md, .zip, or .skill file.');
            }
        } catch {
            setImportError('Failed to read file. Please try again.');
        } finally {
            setParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await processFile(file);
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            if (mode === "create") {
                await onSubmit({ tier, name: name.trim(), trigger: trigger.trim(), body: body.trim() || undefined });
            } else {
                await onSubmit({ tier, name: parsedSkill!.name, trigger: parsedSkill!.trigger, body: parsedSkill!.body });
            }
            onClose();
        } catch (err: any) {
            setSubmitError(err?.message ?? String(err));
            setSubmitting(false);
        }
    };

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    const renderTypeSelector = () => (
        <FieldGroup>
            <Label>Type</Label>
            <TabRow>
                <Tab
                    active={tier === SkillTier.PROJECT}
                    disabled={isEdit}
                    onClick={() => !isEdit && setTier(SkillTier.PROJECT)}
                >
                    Project
                </Tab>
                <Tab
                    active={tier === SkillTier.USER}
                    disabled={isEdit}
                    onClick={() => !isEdit && setTier(SkillTier.USER)}
                >
                    User
                </Tab>
            </TabRow>
            {isEdit ? (
                <Hint>Type cannot be changed when editing. Delete and re-add to change.</Hint>
            ) : tier === SkillTier.PROJECT ? (
                <Hint>Shared with your team.</Hint>
            ) : (
                <Hint>Applies across all projects.</Hint>
            )}
        </FieldGroup>
    );

    return (
        <Overlay onClick={onClose}>
            <Dialog role="dialog" aria-modal="true" onClick={stopPropagation}>
                <Header>
                    <Title>{isEdit ? "Edit skill" : "Add skill"}</Title>
                    <CloseButton type="button" aria-label="Close" onClick={onClose}>
                        <span className="codicon codicon-close" style={{ fontSize: 14 }} />
                    </CloseButton>
                </Header>

                {/* Segmented pill tabs — only shown when not editing */}
                {!isEdit && (
                    <SegmentedBar>
                        <SegmentedTab
                            active={mode === "create"}
                            aria-selected={mode === "create"}
                            onClick={() => setMode("create")}
                        >
                            Create new
                        </SegmentedTab>
                        <SegmentedTab
                            active={mode === "import"}
                            aria-selected={mode === "import"}
                            onClick={() => setMode("import")}
                        >
                            Import
                        </SegmentedTab>
                    </SegmentedBar>
                )}

                <Body>
                    {submitError && <Banner>{submitError}</Banner>}

                    {renderTypeSelector()}

                    {mode === "create" ? (
                        <>
                            <FieldGroup>
                                <Label htmlFor="skill-name">Name</Label>
                                <Input
                                    id="skill-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => !isEdit && setName(e.target.value)}
                                    placeholder="e.g. sql-helper"
                                    readOnly={isEdit}
                                    autoFocus={!isEdit}
                                />
                                {createDuplicate && (
                                    <FieldError>{duplicateMessage(createDuplicate, name.trim())}</FieldError>
                                )}
                            </FieldGroup>

                            <FieldGroup>
                                <Label htmlFor="skill-trigger">Trigger / Description</Label>
                                <Input
                                    id="skill-trigger"
                                    type="text"
                                    value={trigger}
                                    onChange={(e) => setTrigger(e.target.value)}
                                    placeholder="Describe when this skill should be used"
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label htmlFor="skill-body">Body (optional)</Label>
                                <Textarea
                                    id="skill-body"
                                    value={body}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                                    placeholder="Extended rules and instructions for this skill"
                                    rows={4}
                                />
                            </FieldGroup>
                        </>
                    ) : (
                        <>
                            <DropZone
                                active={isDragOver}
                                onClick={() => !parsing && !submitting && fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {parsing ? (
                                    <>
                                        <span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize: 20, color: "var(--vscode-descriptionForeground)" }} />
                                        <DropZoneSubtext>Parsing…</DropZoneSubtext>
                                    </>
                                ) : parsedSkill ? (
                                    <>
                                        <span className="codicon codicon-pass-filled" style={{ fontSize: 22, color: "var(--vscode-testing-iconPassed)" }} />
                                        <DropZonePrimary>{parsedSkill.name}</DropZonePrimary>
                                        <DropZoneSubtext>File uploaded — drop or click to replace</DropZoneSubtext>
                                    </>
                                ) : (
                                    <>
                                        <DropZoneIcon className="codicon codicon-cloud-download" />
                                        <DropZonePrimary>
                                            Drag and drop or <em>click to upload</em>
                                        </DropZonePrimary>
                                        <DropZoneSubtext><em>.md</em> — skill name &amp; description in YAML frontmatter</DropZoneSubtext>
                                        <DropZoneSubtext><em>.zip</em> / <em>.skill</em> — must include a SKILL.md file</DropZoneSubtext>
                                    </>
                                )}
                            </DropZone>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".md,.zip,.skill"
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />

                            {importError && <Banner>{importError}</Banner>}
                            {importDuplicate && (
                                <Banner>
                                    {duplicateMessage(importDuplicate, parsedSkill!.name)}
                                    {importDuplicate.tier !== SkillTier.BUILTIN ? ' Rename the skill in the file and re-upload.' : ''}
                                </Banner>
                            )}

                            <FieldGroup>
                                <Label htmlFor="import-skill-name">Skill name</Label>
                                <Input
                                    id="import-skill-name"
                                    type="text"
                                    value={parsedSkill?.name ?? ''}
                                    readOnly
                                    placeholder="Detected from SKILL.md"
                                />
                            </FieldGroup>
                        </>
                    )}
                </Body>

                <Footer>
                    <SecondaryButton type="button" onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
                    <PrimaryButton type="button" onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting
                            ? (isEdit ? "Saving..." : "Adding...")
                            : (isEdit ? "Save" : "Add")}
                    </PrimaryButton>
                </Footer>
            </Dialog>
        </Overlay>
    );
};

export default AddSkillModal;
