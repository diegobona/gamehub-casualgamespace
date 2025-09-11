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

// 生成URL友好的游戏名称（与前端保持一致）
function generateGameSlug(gameName) {
    return gameName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // 移除特殊字符
        .replace(/\s+/g, '') // 移除空格
        .trim();
}

// 加载游戏数据
let gamesData = [];
try {
    gamesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/JSON/games.json')));
} catch (error) {
    console.error('Failed to load games.json:', error);
}

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
    // 注释掉 /me 接口的处理
    /*
    if (req.method === 'GET' && req.path === '/me') {
        // 前端只检查 res.status 字段是否为 404
        return json(res, { status: 404 });
    }
    */

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
    } else if (!config.mirror.enabled || !req.path.startsWith(config.mirror.config.path)) {
        // 根路径直接返回游戏列表页（index.html）
        if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html' || req.path === '/index')) {
            const appFile = path.join(__dirname, '../', 'index.html');
            res.setHeader('content-type', mime.getType(appFile));
            res.end(fs.readFileSync(appFile));
            return;
        }
        
        // 处理游戏分类路径
        if (req.method === 'GET' && /^\/(all|Action|Puzzle|Racing|Adventure|Arcade|Shooter|Agility|Simulation|Casual)$/.test(req.path)) {
            const appFile = path.join(__dirname, '../', 'index.html');
            res.setHeader('content-type', mime.getType(appFile));
            res.end(fs.readFileSync(appFile));
            return;
        }
        
        // 新增：处理游戏名称路径，返回对应的游戏页面
        if (req.method === 'GET' && req.path.startsWith('/') && req.path.length > 1) {
            const gameSlug = req.path.substring(1); // 移除开头的 '/'
            
            // 查找匹配的游戏
            const matchedGame = gamesData.find(game => {
                const slug = generateGameSlug(game.name);
                return slug === gameSlug;
            });
            
            if (matchedGame) {
                // 返回游戏页面，并传递游戏信息
                const playerFile = path.join(__dirname, '../assets/pages/player.html');
                let playerContent = fs.readFileSync(playerFile, 'utf8');
                
                // 在URL中添加游戏参数
                const gameUrl = new URL(matchedGame.url, 'http://localhost');
                const title = gameUrl.searchParams.get('title') || matchedGame.name;
                const src = gameUrl.searchParams.get('src') || '';
                
                // 修改页面URL参数
                playerContent = playerContent.replace(
                    /const urlParams = new URLSearchParams\(window\.location\.search\);/,
                    `const urlParams = new URLSearchParams('title=${encodeURIComponent(title)}&src=${encodeURIComponent(src)}');`
                );
                
                res.setHeader('content-type', 'text/html');
                res.end(playerContent);
                return;
            }
        }

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

if (config.mirror.enabled) {
    mirrorServer.on('ready', () => server.listen(config.port || process.env.PORT || 8080));
} else {
    server.listen(config.port || process.env.PORT || 8080);
}