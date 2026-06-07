// Loaded into the authoring daemon VM context.

globalThis.guestFrame = null;

globalThis.ensureWorkbench = async () => {
  if (!window || window.isClosed?.()) {
    window = await vscode.firstWindow({ timeout: 60000 });
    extendedPage = new ExtendedPage(window);
  }
  return window;
};

globalThis.waitForGuest = async (viewName = BI_INTEGRATOR_LABEL, timeout = 30000) => {
  await ensureWorkbench();
  const deadline = Date.now() + timeout;
  let lastError = 'unknown';
  while (Date.now() < deadline) {
    try {
      const frame = await switchToIFrame(viewName, window, 5000);
      if (frame) {
        guestFrame = frame;
        return frame;
      }
      lastError = `switchToIFrame(${viewName}) returned no frame`;
    } catch (error) {
      lastError = error.message;
    }
    try {
      const webview = window.locator('iframe.webview.ready').last();
      if (await webview.isVisible({ timeout: 1000 }).catch(() => false)) {
        const outer = await (await webview.elementHandle()).contentFrame();
        const child = outer?.childFrames().find((frame) => {
          try {
            return frame.url().includes('vscode-webview') || frame.url().includes('fake.html');
          } catch {
            return false;
          }
        }) ?? outer?.childFrames()[0] ?? outer;
        if (child) {
          await child.waitForLoadState().catch(() => {});
          guestFrame = child;
          return child;
        }
      }
    } catch (error) {
      lastError = error.message;
    }
    await window.waitForTimeout(500);
  }
  throw new Error(`BI webview not ready: ${lastError}`);
};

globalThis.getBIWebview = async (timeout = 30000) => waitForGuest(BI_INTEGRATOR_LABEL, timeout);

globalThis.snapshot = async (filter) => {
  const frame = await getBIWebview();
  const raw = await frame.locator('body').ariaSnapshot();
  if (!filter) return raw;
  const re = filter instanceof RegExp ? filter : new RegExp(filter, 'i');
  return raw.split('\n').filter((line) => re.test(line)).join('\n');
};

globalThis.hostSnapshot = async () => {
  await ensureWorkbench();
  return window.locator('body').ariaSnapshot();
};

globalThis.waitForText = async (text, timeout = 30000) => {
  await ensureWorkbench();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const snap = await snapshot().catch(() => '');
    if (snap.includes(text)) return snap;
    await window.waitForTimeout(500);
  }
  throw new Error(`waitForText("${text}") timed out after ${timeout}ms`);
};

globalThis.guestClick = async (locator) => {
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ force: true });
};

globalThis.guestFill = async (locator, text) => {
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  await locator.click({ force: true });
  await locator.fill('').catch(async () => {
    await window.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  });
  await window.keyboard.type(text);
};

globalThis.cmFill = async (text, index = 0) => {
  const frame = await getBIWebview();
  await frame.evaluate(({ text, index }) => {
    const els = document.querySelectorAll('.cm-content');
    const el = els[index];
    if (!el) throw new Error(`CodeMirror editor not found at index ${index}`);
    const view = el.cmView?.view;
    if (!view) throw new Error('CodeMirror view instance not found');
    view.focus();
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
  }, { text, index });
};

globalThis.listTestIds = async () => {
  const frame = await getBIWebview();
  return frame.locator('[data-testid]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid')).filter(Boolean).sort()
  );
};

globalThis.recordSelectorGap = (description, preferredTestId) => {
  const out = path.join(sessionDir, 'selector-gaps.md');
  fs.appendFileSync(out, `- ${description} -> \`${preferredTestId}\`\n`);
  return out;
};

globalThis.waitForEndpoint = async (url, timeout = 60000, opts = {}) => {
  const deadline = Date.now() + timeout;
  const body = opts.bodyFile ? fs.readFileSync(opts.bodyFile) : opts.body;
  while (Date.now() < deadline) {
    const result = await new Promise((resolve) => {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        u,
        { method: opts.method || 'GET', headers: opts.headers || {}, timeout: 5000 },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      if (body !== undefined) req.write(body);
      req.end();
    });
    if (result && result.status > 0) return result;
    await window.waitForTimeout(1000);
  }
  throw new Error(`waitForEndpoint("${url}") timed out after ${timeout}ms`);
};
