import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';
import mime from 'mime';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const server = http.createServer();

server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    
    // 处理根路径和SPA路由（包括游戏和分类页面）
    if (pathname === '/' || 
        pathname === '/index.html' || 
        pathname.startsWith('/game/') ||
        pathname.startsWith('/category/') ||
        (!pathname.includes('.') && !pathname.startsWith('/assets'))) {
        const indexFile = path.join(__dirname, '../index.html');
        res.setHeader('content-type', 'text/html');
        res.end(fs.readFileSync(indexFile));
        return;
    }
    
    // 静态文件服务
    const filePath = path.join(__dirname, '..', pathname);
    
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        res.setHeader('content-type', mime.getType(filePath));
        res.end(fs.readFileSync(filePath));
    } else {
        res.statusCode = 404;
        res.setHeader('content-type', 'text/html');
        const notFoundFile = path.join(__dirname, '../404.html');
        if (fs.existsSync(notFoundFile)) {
            res.end(fs.readFileSync(notFoundFile));
        } else {
            res.end('404 Not Found');
        }
    }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`GameHub server running at http://localhost:${port}`);
});
