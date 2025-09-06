import mime from 'mime';

import Mirror from './mirror.js';

import childProcess from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const server = http.createServer();
const packageFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'))).serverConfig;

// 安全获取 Git 短 SHA（非 Git 仓库或命令失败时返回 'nogit'）
const getShortGitSha = () => {
    try {
        return childProcess.execSync('git rev-parse HEAD').toString().trim().slice(0, 7);
    } catch {
        return 'nogit';
    }
};

const pathToFile = (url = '', folderPath) => {
    if (url.endsWith('/')) url = url + 'index.html';
    else if (url.split(/[#?]/)[0].split('.').pop().trim() === url) {
        if (!fs.existsSync(path.join(folderPath, url))) url = url + '.html';
    }

    return {
        exists: fs.existsSync(path.join(folderPath, url)),
        path: path.join(folderPath, url)
    };
};

/**
 * @type {Mirror}
 */
const mirrorServer = (config.mirror.enabled ? new Mirror(config.mirror.config, packageFile, server) : {});

// --- Mock data for local demo ---
const sampleGames = [
    { id: 1, name: 'Space Blaster', thumbnail: '/assets/img/logo.png', url: 'https://example.com', use: 'gameframe' },
    { id: 2, name: 'Retro Racer',  thumbnail: '/assets/img/logo.png', url: 'https://example.com', use: 'gameframe' },
    { id: 3, name: 'Puzzle Mania',  thumbnail: '/assets/img/logo.png', url: 'https://example.com', use: 'gameframe' },
    { id: 4, name: 'Block Builder', thumbnail: '/assets/img/logo.png', url: 'https://example.com', use: 'gameframe' },
    { id: 5, name: 'Dungeon Run',   thumbnail: '/assets/img/logo.png', url: 'https://example.com', use: 'gameframe' },
    { id: 6, name: 'Fruit Catcher', thumbnail: '/assets/img/logo.png', url: 'https://example.com', use: 'gameframe' }
];

const json = (res, obj, status = 200) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
};

server.on('request', (req, res) => {
    req.path = new URL('http://localhost' + req.url).pathname;
    var ignoredPath;

    // --- Local mock API routes (only when no external server is configured) ---
    if (req.method === 'GET' && req.path === '/games') {
        return json(res, sampleGames);
    }
    if (req.method === 'GET' && /^\/games\/\d+$/.test(req.path)) {
        const id = Number(req.path.split('/')[2]);
        const game = sampleGames.find(g => g.id === id);
        if (game) return json(res, game);
        else return json(res, { status: 404, message: 'Game not found' }, 404);
    }
    if (req.method === 'GET' && /^\/games\/\d+\/recomended$/.test(req.path)) {
        const id = Number(req.path.split('/')[2]);
        const rec = sampleGames.filter(g => g.id !== id).slice(0, 6);
        return json(res, rec);
    }
    if (req.method === 'GET' && req.path === '/token') {
        return json(res, { token: 'dev-token', id: 'dev' });
    }
    if (req.method === 'GET' && req.path === '/me') {
        // 前端只检查 res.status 字段是否为 404
        return json(res, { status: 404 });
    }

    config.ignoredPaths.forEach(path => {
        if (path.endsWith('/*') && req.path.startsWith(path.slice(-2))) ignoredPath = true;
    });

    if (req.path === '/config.json') {
        const rewrittenConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json')));
        rewrittenConfig.serverConfig = undefined;

        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(rewrittenConfig));
    } else if (config.ignoredPaths.includes(req.path) || ignoredPath) {
        res.statusCode = 404;
        res.setHeader('content-type', 'text/html');
        res.end(fs.readFileSync(path.join(__dirname, '../', '404.html')));
    } else if (!req.path.startsWith(config.mirror.config.path)) {
        const file = pathToFile(req.path, path.join(__dirname, '../'));

        if (file.exists) {
            res.setHeader('content-type', mime.getType(file.path));
            res.end(fs.readFileSync(file.path));
        } else {
            res.statusCode = 404;
            res.setHeader('content-type', 'text/html');
            res.end(fs.readFileSync(path.join(__dirname, '../', '404.html')));
        }
    }
});

server.on('listening', () => console.log(`GameHub server listening

Port: ${server.address().port}
Version: ${packageFile.version} ${getShortGitSha()}${config.mirror.enabled ? `\nMirror Server Version: ${mirrorServer.package.version} ${mirrorServer.latestCommit.sha.slice(0, 7)}` : ''}`));

if (config.mirror.enabled) mirrorServer.on('ready', () => server.listen(config.port || process.env.PORT || 8080));
else server.listen(config.port || process.env.PORT || 8080);