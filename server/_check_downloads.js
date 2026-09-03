// Kiểm tra trạng thái 30 ảnh đã tải
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..', 'assets', 'images', 'products');

let ok = 0, missing = [], small = [];
for (let i = 1; i <= 30; i++) {
    const name = 'real-may-giat-' + String(i).padStart(2, '0') + '.jpg';
    const fp = path.join(dir, name);
    if (!fs.existsSync(fp)) {
        missing.push(name);
    } else {
        const size = fs.statSync(fp).size;
        if (size < 10000) small.push(name + ' (' + size + 'B)');
        else ok++;
    }
}
console.log('OK kích thước hợp lệ (>10KB): ' + ok + '/30');
console.log('Thiếu: ' + (missing.length ? missing.join(', ') : 'không'));
console.log('File nhỏ bất thường: ' + (small.length ? small.join(', ') : 'không'));
