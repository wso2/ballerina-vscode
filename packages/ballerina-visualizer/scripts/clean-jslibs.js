const fs = require('fs').promises;
const path = require('path');

async function main() {
    try {
        const targetDir = path.resolve(__dirname, '..', 'ballerina-extension', 'resources', 'jslibs');
        await fs.access(targetDir);
    } catch (e) {
        console.log('Target jslibs directory not found, skipping cleanup.');
        return;
    }

    const targetDir = path.resolve(__dirname, '..', 'ballerina-extension', 'resources', 'jslibs');
    try {
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        const deletes = entries
            .filter((d) => d.isFile() && /^[0-9].*\.js$/.test(d.name))
            .map((d) => fs.unlink(path.join(targetDir, d.name)));

        if (deletes.length === 0) {
            console.log('No versioned JS files to remove.');
            return;
        }

        await Promise.all(deletes);
        console.log(`Removed ${deletes.length} versioned JS file(s) from ${targetDir}`);
    } catch (err) {
        console.error('Error cleaning jslibs directory:', err);
        process.exitCode = 1;
    }
}

main();
