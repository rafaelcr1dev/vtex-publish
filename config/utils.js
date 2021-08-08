const path = require('path');
const slash = require('slash');

// Base `src` path
module.exports.srcPath = (basePath = '', destPath = '') => slash(
	path.resolve(__dirname, './src', basePath, destPath)
);

module.exports.modulePath = (basePath = '', destPath = '') => slash(
	path.resolve(__dirname, './modules', basePath, destPath)
);
