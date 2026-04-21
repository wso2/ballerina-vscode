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

import {
    By,
    until,
    VSBrowser,
    Locator,
    WebElement,
    WebDriver,
    ActivityBar,
    BottomBarPanel,
    InputBox,
    WebView
} from "vscode-extension-tester";
import { DEFAULT_TIME_OUT, DND_PALETTE_COMMAND, VSCODE_ZOOM_TIME } from "./constants";
import { fail } from "assert";

export function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitUntil(locator: Locator, timeout: number = DEFAULT_TIME_OUT) {
    return VSBrowser.instance.driver.wait(until.elementLocated(locator), timeout);
}

export async function getAvailableInput() {
    return await VSBrowser.instance.driver.wait(until.elementIsVisible(new InputBox()), DEFAULT_TIME_OUT) as InputBox;
}

export function waitUntilTextContains(
    element: WebElement,
    text: string,
    timeout: number = DEFAULT_TIME_OUT
) {
    return VSBrowser.instance.driver.wait(
        until.elementTextContains(element, text),
        timeout,
        "Element text did not contain " + text
    );
}

export async function waitForMultipleElementsLocated(
    locators: By[],
    timeout: number = DEFAULT_TIME_OUT
) {
    const promises = locators.map(locator =>
        VSBrowser.instance.driver.wait(until.elementLocated(locator), timeout)
    );
    try {
        await Promise.all(promises);
    } catch (error) {
        throw new Error(`One or more elements were not located within the timeout`);
    }
}

export function getElementByXPathUsingTestID(
    testID: string
) {
    return By.xpath("//*[@data-testid='" + testID + "']");
}

export function getInputElementByXPathUsingValue(
    value: string
) {
    return By.xpath("//input[@value='" + value + "']");
}

export function getElementByXPathUsingTitle(
    title: string
) {
    return By.xpath("//*[@title='" + title + "']");
}

export async function waitForElementToAppear(
    testId: string,
) {
    waitUntil(getElementByXPathUsingTestID(testId));
}

export async function clickListItem(webview: WebView, className: string, text: string) {
    const options = await webview.findWebElement(By.xpath(`//li[contains(@class, '${className}') and contains(text(), '${text}')]`));
    await waitUntilVisible(options);
    await options.click();
}

export async function clickWebElement(webview: WebView, locator: Locator) {
    const element = await webview.findWebElement(locator);
    await element.click();
}

export async function waitForElementToDisappear(
    elementLocator: By,
    timeout: number = DEFAULT_TIME_OUT
) {
    return await VSBrowser.instance.driver
        .wait(until.stalenessOf(VSBrowser.instance.driver.findElement(elementLocator)), timeout);
}

export function areVariablesIncludedInString(variables, str) {
    for (const variable of variables) {
        if (!str.includes(variable)) {
            return false;
        }
    }
    return true;
}

export async function switchToIFrame(
    frameName: string,
    driver: WebDriver,
    timeout: number = DEFAULT_TIME_OUT
) {
    let allIFrames: WebElement[] = [];
    const startTime = Date.now();

    while (allIFrames.length === 0) {
        allIFrames = await driver.findElements(By.xpath("//iframe"));

        if (Date.now() - startTime > timeout) {
            throw new Error(`Timeout: Unable to find any iframes within ${timeout}ms`);
        }
    }

    for (const iframeItem of allIFrames) {
        try {
            await driver.switchTo().frame(iframeItem);
            try {
                const frameElement = await driver.wait(
                    until.elementLocated(By.xpath(`//iframe[@title='${frameName}']`)),
                    timeout
                );
                await driver.switchTo().frame(frameElement);
                return frameElement;
            } catch {
                // Go back to root level if unable to find the frame name
                await driver.switchTo().parentFrame();
            }
        } catch {
            // no need to handle this catch block
        }
    }

    throw new Error(`IFrame of ${frameName} not found`);
}

export async function clickOnActivity(activityName: string) {
    const activityBar = new ActivityBar();
    const viewControl = await activityBar.getViewControl(activityName);
    viewControl.click();
}

export async function getLabelElement(driver: WebDriver, targetSubstring: string) {
    return await driver.findElement(By.xpath(`//*[contains(text(), "${targetSubstring}")]`));
}

export function waitForWebview(name: string) {
    return waitUntil(By.xpath("//div[@title='" + name + "']"));
}

export async function verifyTerminalText(text: string) {
    const terminal = await new BottomBarPanel().openTerminalView();

    await waitUntilTextContains(terminal, text, 240000).catch((e) => {
        fail(e);
    });
}

export async function waitUntilElementIsEnabled(locator: By, timeout: number = DEFAULT_TIME_OUT): Promise<WebElement> {
    const maxTimeout = timeout;
    const driver = VSBrowser.instance.driver;
    let element: WebElement;
    let elementIdentifier;
    return new Promise(async (resolve, reject) => {
        const startTime = Date.now();
        const checkElementEnabled = async () => {
            try {
                if (!elementIdentifier) {
                    // Initial attempt or re-locate if stale
                    element = await driver.findElement(locator);
                    elementIdentifier = await element.getAttribute('xpath');
                } else {
                    element = await driver.findElement(By.xpath(elementIdentifier));
                }
                await driver.wait(until.elementIsEnabled(element), maxTimeout - (Date.now() - startTime));
                resolve(element);
            } catch (error) {
                if (Date.now() - startTime < maxTimeout) {
                    setTimeout(checkElementEnabled, 1000);
                } else {
                    reject(new Error('Element not found or not enabled within the specified timeout'));
                }
            }
        };
        await checkElementEnabled();
    });
}

export async function waitForBallerina() {
    const elementText = 'Detecting';
    const xpath = By.xpath(`//*[contains(text(), '${elementText}')]`);
    const element = await waitUntil(xpath, 30000);
    await VSBrowser.instance.driver.wait(until.elementTextContains(element, "Swan"));
}

export async function workbenchZoomOut(workbench, times) {
    for (let i = 1; i <= times; i++) {
        await workbench.executeCommand("View: Zoom Out");
        await wait(VSCODE_ZOOM_TIME); // This is a constant wait to apply zoom effect into the vscode
    }
}

export function waitUntilVisible(element: WebElement, timeout: number = DEFAULT_TIME_OUT) {
    return VSBrowser.instance.driver.wait(until.elementIsVisible(element), timeout);
}

export async function enableDndMode(workbench) {
    try {
        // Enabling DND mode so that notifications do not interfere with the UI elements
        await waitUntil(By.xpath("//div[@id='status.notifications' and @aria-label='Notifications']"), 10000);
        await workbench.executeCommand(DND_PALETTE_COMMAND);
    } catch {
        // dnd mode already enabled
    }
}
