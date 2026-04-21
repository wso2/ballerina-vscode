#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const LS_DIR = path.join(PROJECT_ROOT, 'ls');
const GITHUB_REPO_URL = 'https://api.github.com/repos/ballerina-platform/ballerina-language-server';

const args = process.argv.slice(2);

function getTag() {
    const tagIdx = args.indexOf('--tag');
    if (tagIdx !== -1 && args[tagIdx + 1]) return args[tagIdx + 1];
    if (process.env.BALLERINA_LS_TAG) return process.env.BALLERINA_LS_TAG;
    return 'latest';
}

const tag = getTag();
const forceReplace = args.includes('--replace');
const resolveVersionOnly = args.includes('--resolve-version');

function checkExistingJar(expectedVersion) {
    try {
        if (!fs.existsSync(LS_DIR)) {
            return false;
        }

        const files = fs.readdirSync(LS_DIR);
        const jarFiles = files.filter(file => file.includes('ballerina-language-server-') && file.endsWith('.jar'));

        if (jarFiles.length === 0) {
            return false;
        }

        const expectedJar = jarFiles.find(file => file === `ballerina-language-server-${expectedVersion}.jar`);
        if (expectedJar) {
            console.log(`Ballerina language server JAR for version ${expectedVersion} already exists in ${path.relative(PROJECT_ROOT, LS_DIR)}`);
            return true;
        }

        console.log(`Existing JAR does not match requested version ${expectedVersion}; downloading.`);
        return false;
    } catch (error) {
        console.error('Error checking existing JAR files:', error.message);
        return false;
    }
}

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const authHeader = {};
        if (process.env.CHOREO_BOT_TOKEN) {
            authHeader['Authorization'] = `Bearer ${process.env.CHOREO_BOT_TOKEN}`;
        } else if (process.env.GITHUB_TOKEN) {
            authHeader['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }

        const req = https.request(url, {
            ...options,
            headers: {
                'User-Agent': 'Ballerina-LS-Downloader',
                'Accept': 'application/vnd.github.v3+json',
                ...authHeader,
                ...options.headers
            }
        }, (res) => {
            // Handle HTTP 403 errors specifically
            if (res.statusCode === 403) {
                console.error('HTTP 403: Forbidden. This may be due to GitHub API rate limiting.');
                console.error('Set GITHUB_TOKEN environment variable with a personal access token to increase rate limits.');

                // Log rate limit info if available
                if (res.headers['x-ratelimit-limit']) {
                    console.error(`Rate limit: ${res.headers['x-ratelimit-remaining']}/${res.headers['x-ratelimit-limit']}`);
                    console.error(`Rate limit resets at: ${new Date(res.headers['x-ratelimit-reset'] * 1000).toLocaleString()}`);
                }
            }
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ data, statusCode: res.statusCode, headers: res.headers });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

function downloadFile(url, outputPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);

        const makeRequest = (requestUrl, redirectCount = 0) => {
            const req = https.request(requestUrl, {
                headers: {
                    'User-Agent': 'Ballerina-LS-Downloader',
                    'Accept': 'application/octet-stream'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (redirectCount >= maxRedirects) {
                        file.close();
                        fs.unlink(outputPath, () => { });
                        reject(new Error(`Too many redirects (${redirectCount})`));
                        return;
                    }

                    makeRequest(res.headers.location, redirectCount + 1);
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });

                    file.on('error', (err) => {
                        fs.unlink(outputPath, () => { });
                        reject(err);
                    });
                } else {
                    file.close();
                    fs.unlink(outputPath, () => { });
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });

            req.on('error', (err) => {
                file.close();
                fs.unlink(outputPath, () => { });
                reject(err);
            });

            req.end();
        };

        makeRequest(url);
    });
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return 'unknown';
    }
}

async function getRelease(tag) {
    if (tag === 'prerelease') {
        const releasesResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases`);
        let releases;
        try {
            releases = JSON.parse(releasesResponse.data);
        } catch (error) {
            throw new Error('Failed to parse releases information JSON');
        }
        const prerelease = releases
            .filter(release => release.prerelease)
            .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];

        if (!prerelease) {
            throw new Error('No prerelease found');
        }
        return prerelease;
    } else if (tag === 'latest') {
        try {
            const releaseResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases/latest`);
            return JSON.parse(releaseResponse.data);
        } catch (error) {
            if (error.message.includes('404')) {
                console.log('No stable release found, fetching the most recent release...');
                const releasesResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases?per_page=1`);
                const releases = JSON.parse(releasesResponse.data);
                if (!releases.length) {
                    throw new Error('No releases found in the repository');
                }
                return releases[0];
            }
            throw error;
        }
    } else {
        // Specific version tag e.g. v1.5.0
        const releaseResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases/tags/${tag}`);
        try {
            return JSON.parse(releaseResponse.data);
        } catch (error) {
            throw new Error(`Failed to parse release information JSON for tag ${tag}`);
        }
    }
}

async function resolveAndOutputVersion(tag) {
    console.log(`Resolving Ballerina language server version for tag: ${tag}...`);
    const releaseData = await getRelease(tag);
    const version = releaseData.tag_name;
    console.log(`Resolved version: ${version}`);
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    } else {
        console.log(`::set-output name=version::${version}`);
    }
}

async function main() {
    try {
        if (resolveVersionOnly) {
            await resolveAndOutputVersion(tag);
            process.exit(0);
        }

        // For concrete tags: check cache before making any network request
        if (!forceReplace && tag !== 'latest' && tag !== 'prerelease') {
            const version = tag.startsWith('v') ? tag.slice(1) : tag;
            if (checkExistingJar(version)) {
                process.exit(0);
            }
        }

        console.log(`Downloading Ballerina language server (tag: ${tag})${forceReplace ? ' (force replace)' : ''}...`);

        if (forceReplace && fs.existsSync(LS_DIR)) {
            console.log('Force replace enabled: clearing existing language server directory...');
            fs.rmSync(LS_DIR, { recursive: true, force: true });
        }

        if (!fs.existsSync(LS_DIR)) {
            fs.mkdirSync(LS_DIR, { recursive: true });
        }

        console.log('Fetching release information...');
        const releaseData = await getRelease(tag);

        if (!releaseData?.tag_name) {
            throw new Error('Invalid release data: missing tag_name');
        }

        // For floating tags: resolve concrete version, then check cache
        if (!forceReplace && (tag === 'latest' || tag === 'prerelease')) {
            const concreteVersion = releaseData.tag_name.startsWith('v')
                ? releaseData.tag_name.slice(1)
                : releaseData.tag_name;
            if (checkExistingJar(concreteVersion)) {
                process.exit(0);
            }
        }

        const jarAsset = releaseData.assets?.find(asset =>
            asset.name.includes('ballerina-language-server-') &&
            asset.name.endsWith('.jar')
        );

        if (!jarAsset) {
            console.error('Error: Could not find language server JAR asset');
            console.error('Available assets:');
            releaseData.assets?.forEach(asset => console.error(`  - ${asset.name}`));
            process.exit(1);
        }

        console.log(`Found asset ID: ${jarAsset.id}`);
        console.log(`Asset name: ${jarAsset.name}`);

        const lsJarPath = path.join(LS_DIR, jarAsset.name);

        console.log('Downloading language server JAR...');
        const downloadUrl = `${GITHUB_REPO_URL}/releases/assets/${jarAsset.id}`;

        await downloadFile(downloadUrl, lsJarPath);

        if (fs.existsSync(lsJarPath)) {
            const fileSize = getFileSize(lsJarPath);
            if (fileSize > 0) {
                const relativePath = path.relative(PROJECT_ROOT, lsJarPath);
                console.log(`Successfully downloaded Ballerina language server to ${relativePath}`);
                console.log(`File size: ${fileSize} bytes`);

                // Remove stale JARs (keep only the one just downloaded)
                const staleJars = fs.readdirSync(LS_DIR).filter(f =>
                    f.includes('ballerina-language-server-') && f.endsWith('.jar') && f !== jarAsset.name
                );
                staleJars.forEach(f => {
                    fs.unlinkSync(path.join(LS_DIR, f));
                    console.log(`Removed stale JAR: ${f}`);
                });
            } else {
                throw new Error('Downloaded file is empty');
            }
        } else {
            throw new Error('Downloaded file does not exist');
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, checkExistingJar, getRelease };

