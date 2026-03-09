/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package org.ballerinalang.langserver.workspace.workspacemanager;

import java.util.ArrayDeque;
import java.util.Optional;

/**
 * Thread-safe stack of locking modes used by {@link LockingModeController} for temporary escalation.
 *
 * @since 1.7.0
 */
class ModeStack {

    private final ArrayDeque<LockingMode> stack;

    ModeStack() {
        this.stack = new ArrayDeque<>();
    }

    /**
     * Pushes a mode onto the stack.
     *
     * @param mode the locking mode to push
     */
    synchronized void push(LockingMode mode) {
        stack.push(mode);
    }

    /**
     * Pops the top mode from the stack.
     *
     * @return the top mode, or empty if the stack is empty
     */
    synchronized Optional<LockingMode> pop() {
        if (stack.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(stack.pop());
    }

    /**
     * Peeks at the top mode without removing it.
     *
     * @return the top mode, or empty if the stack is empty
     */
    synchronized Optional<LockingMode> peek() {
        if (stack.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(stack.peek());
    }

    /**
     * Returns whether the stack is empty.
     *
     * @return true if empty
     */
    synchronized boolean isEmpty() {
        return stack.isEmpty();
    }

    /**
     * Returns the number of elements in the stack.
     *
     * @return stack size
     */
    synchronized int size() {
        return stack.size();
    }

    /**
     * Clears all elements from the stack.
     */
    synchronized void clear() {
        stack.clear();
    }
}
