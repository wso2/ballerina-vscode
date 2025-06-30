#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const LS_DIR = path.join(PROJECT_ROOT, 'ls');
const GITHUB_REPO_URL = 'https://api.github.com/repos/ballerina-platform/ballerina-language-server';

const args = process.argv.slice(2);
const usePrerelease = args.includes('--prerelease') || process.env.isPreRelease === 'true';

function checkExistingJar() {
    try {
        if (!fs.existsSync(LS_DIR)) {
            return false;
        }
        
        const files = fs.readdirSync(LS_DIR);
        const jarFiles = files.filter(file => file.includes('ballerina-language-server-') && file.endsWith('.jar'));
        
        if (jarFiles.length > 0) {
            console.log(`Ballerina language server JAR already exists in ${path.relative(PROJECT_ROOT, LS_DIR)}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking existing JAR files:', error.message);
        return false;
    }
}

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            ...options,
            headers: {
                'User-Agent': 'Ballerina-LS-Downloader',
                'Accept': 'application/vnd.github.v3+json',
                ...options.headers
            }
        }, (res) => {
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
                        fs.unlink(outputPath, () => {});
                        reject(new Error(`Too many redirects (${redirectCount})`));
                        return;
                    }
                    
                    console.log(`Following redirect to: ${res.headers.location}`);
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
                        fs.unlink(outputPath, () => {});
                        reject(err);
                    });
                } else {
                    file.close();
                    fs.unlink(outputPath, () => {}); 
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
            
            req.on('error', (err) => {
                file.close();
                fs.unlink(outputPath, () => {});
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

async function getLatestRelease(usePrerelease) {
    if (usePrerelease) {
        // Get all releases and find the latest prerelease
        const releasesResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases`);
        let releases;
        try {
            releases = JSON.parse(releasesResponse.data);
        } catch (error) {
            throw new Error('Failed to parse releases information JSON');
        }
        // Sort releases by published_at date in descending order and find the latest prerelease
        const prerelease = releases
            .filter(release => release.prerelease)
            .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];
            
        if (!prerelease) {
            throw new Error('No prerelease found');
        }
        return prerelease;
    } else {
        // Get the latest stable release
        const releaseResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases/latest`);
        try {
            return JSON.parse(releaseResponse.data);
        } catch (error) {
            throw new Error('Failed to parse release information JSON');
        }
    }
}

async function main() {
    try {
        if (checkExistingJar()) {
            process.exit(0);
        }
        
        console.log(`Downloading Ballerina language server${usePrerelease ? ' (prerelease)' : ''}...`);
        
        if (!fs.existsSync(LS_DIR)) {
            fs.mkdirSync(LS_DIR, { recursive: true });
        }
        
        console.log('Fetching release information...');
        const releaseData = await getLatestRelease(usePrerelease);
        
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

module.exports = { main, checkExistingJar }; 
