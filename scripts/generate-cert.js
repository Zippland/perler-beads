const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certificates');

// 创建证书目录
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

console.log('生成本地 HTTPS 证书...');

try {
  // 生成私钥
  execSync(`openssl genrsa -out ${certDir}/localhost-key.pem 2048`);
  
  // 生成证书请求
  execSync(`openssl req -new -key ${certDir}/localhost-key.pem -out ${certDir}/localhost.csr -subj "/C=CN/ST=Beijing/L=Beijing/O=Dev/CN=localhost"`);
  
  // 生成自签名证书
  execSync(`openssl x509 -req -in ${certDir}/localhost.csr -signkey ${certDir}/localhost-key.pem -out ${certDir}/localhost.pem -days 365`);
  
  console.log('证书生成成功！');
  console.log(`证书位置: ${certDir}/localhost.pem`);
  console.log(`私钥位置: ${certDir}/localhost-key.pem`);
  
  // 清理 CSR 文件
  fs.unlinkSync(`${certDir}/localhost.csr`);
} catch (error) {
  console.error('生成证书失败:', error.message);
  process.exit(1);
}