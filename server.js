const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3001;

const app = next({ dev });
const handle = app.getRequestHandler();

// 检查证书是否存在
const certPath = path.join(__dirname, 'certificates', 'localhost.pem');
const keyPath = path.join(__dirname, 'certificates', 'localhost-key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('HTTPS 证书不存在！请先运行: node scripts/generate-cert.js');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> HTTPS Server ready on https://${hostname}:${port}`);
    console.log('> 使用自签名证书，浏览器可能会显示安全警告');
    console.log('> 在手机上访问时，请使用电脑的局域网 IP 地址');
    console.log(`> 例如: https://YOUR_COMPUTER_IP:${port}`);
  });
});