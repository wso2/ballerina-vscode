(globalThis as any).structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
