import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';
import mime from 'mime';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const server = http.createServer();

server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;

    // 统一规范路径，移除重复的斜杠
    pathname = pathname.replace(/\\+/g, '/');

    // 任何包含 /assets/ 片段的请求，都映射到项目根目录下的 /assets/... 静态资源
    if (pathname.includes('/assets/')) {
        const assetsPath = pathname.substring(pathname.indexOf('/assets/'));
        const filePath = path.join(__dirname, '..', assetsPath);
        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            res.setHeader('content-type', mime.getType(filePath) || 'application/octet-stream');
            res.end(fs.readFileSync(filePath));
            return;
        }
        // 如果指定的 assets 文件不存在，返回 404
        res.statusCode = 404;
        res.setHeader('content-type', 'text/html');
        const notFoundFile = path.join(__dirname, '../404.html');
        res.end(fs.existsSync(notFoundFile) ? fs.readFileSync(notFoundFile) : '404 Not Found');
        return;
    }

    // 处理根路径和SPA路由（包括游戏和分类页面）
    if (
        pathname === '/' ||
        pathname === '/index.html' ||
        pathname.startsWith('/game/') ||
        pathname.startsWith('/category/') ||
        (!pathname.includes('.')) // 没有后缀的一律当作前端路由
    ) {
        const indexFile = path.join(__dirname, '../index.html');
        res.setHeader('content-type', 'text/html');
        res.end(fs.readFileSync(indexFile));
        return;
    }

    // 其他静态文件服务（例如 /config.json、/site.webmanifest 等）
    const filePath = path.join(__dirname, '..', pathname);
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        res.setHeader('content-type', mime.getType(filePath) || 'application/octet-stream');
        res.end(fs.readFileSync(filePath));
        return;
    }

    // 默认 404
    res.statusCode = 404;
    res.setHeader('content-type', 'text/html');
    const notFoundFile = path.join(__dirname, '../404.html');
    res.end(fs.existsSync(notFoundFile) ? fs.readFileSync(notFoundFile) : '404 Not Found');
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`GameHub server running at http://localhost:${port}`);
});
