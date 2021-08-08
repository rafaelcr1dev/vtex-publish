const ora = require('ora');
const fs = require('fs');
const contentFilePath = './vtex.settings.json';
const contentFilePathLogError = './vtex.errors.log';
const vtexConfig = require('../vtex.config.json');
const chalk = require('chalk');

module.exports = {
    contentVtexSettings: function (input, token, authenticationInfo) {

        return {
            "input": input,
            "token": token,
            "authenticationInfo": authenticationInfo
        }

    },
    headerCookie: function (authenticationInfo) {

        return authenticationInfo.authCookie.Name + "=" + authenticationInfo.authCookie.Value;

    },
    jsonToString: function (json) {

        return JSON.stringify(json);

    },
    stringToJson: function (fileBuffer) {

        return JSON.parse(fileBuffer);

    },
    saveFileCache: function (content) {

        this.saveFile(contentFilePath, content);

    },
    saveFileLogError: async function (content) {

        let currentContent = await this.readFileContent(contentFilePathLogError);

        currentContent = currentContent || "";

        return this.save(contentFilePathLogError, currentContent.toString() + "\n" + content.toString());

    },
    saveFile: function (contentFilePath, content) {

        const contentString = this.jsonToString(content);

        return this.save(contentFilePath, contentString);

    },
    rewriteFile: function (contentFilePath, content) {

        return this.save(contentFilePath, content);

    },
    save: function (contentFilePath, content) {

        return fs.writeFileSync(contentFilePath, content);

    },
    deleteFileCache: function () {

        return this.delete(contentFilePath);

    },
    deleteFileLog: function () {

        return this.delete(contentFilePathLogError);

    },
    delete: function (pathFolder) {

        try {

            if (fs.existsSync(pathFolder)) {

                return fs.unlinkSync(pathFolder);

            }

        } catch (err) {

            return false;

        }

    },
    readFileContent: function (pathFolder) {

        try {

            if (fs.existsSync(pathFolder)) {

                return fs.readFileSync(pathFolder, 'utf-8');

            }

        } catch (err) {

            return false;

        }

    },
    loadFileCache: function () {

        try {

            if (fs.existsSync(contentFilePath)) {

                const fileBuffer = fs.readFileSync(contentFilePath, 'utf-8');
                const contentJson = this.stringToJson(fileBuffer);

                return contentJson;

            }

        } catch (err) {

            return {};

        }

    },
    getExtensionFile: function (file) {

        const list = file.split(".");

        return list[list.length - 1];

    },
    getFilesOfDirectory: function (pathFolder) {

        return fs.readdirSync(pathFolder);

    },
    getNameFile: function (file) {

        return file.split(".")[0];

    },
    buildURL: function (url, input) {

        if (!url) return "";

        return url.replace("{project_name}", input.project_name);

    },
    errorMessage: function (e) {

        console.log(`ERRO: ${e}`);

    },
    startLoading: function (text, color) {

        const spinner = ora('Loading.... ').start();

        setTimeout(() => {
            spinner.color = color;
            spinner.text = text;
        }, 1000);

        return spinner;

    },
    stopLoading: function (spinner) {

        spinner.stop();

    },
    toFormData: function (data) {

        let formData = "";

        for (const key in data) {

            formData += "&" + key + "=" + data[key];

        }

        return formData.substring(1);

    },
    messageOfFinishProcess: function () {

        console.log(chalk.green("\n\nProcess was successfully completed! :)\n\n"));

    },
    generateFormData: function (filePath, requestToken) {

        return {
            Filename: filePath,
            fileext: '*.jpg;*.png;*.gif;*.jpeg;*.ico;*.js;*.css;*.svg,*.pdf',
            folder: '/uploads',
            Upload: 'Submit Query',
            requestToken: requestToken,
            Filedata: createReadStream(filePath)
        }

    },
    makeUploads: function (type) {

        if (!type) return false;

        return {
            isActive: vtexConfig.make_uploads[type],
            files: vtexConfig.publish[type]
        }

    },
    hasPrefixInTemplate: function(templateName){

        if (!templateName) return;

        if (!vtexConfig.import.templates.prefix) return true;
        
        return (templateName.indexOf(vtexConfig.import.templates.prefix) == 0) ? true : false;

    },
    consoleMessage: function (msg, color) {

        if (!msg || !color) return;

        console.log(chalk[color](msg));

        if (color === 'red') {

            this.saveFileLogError(msg);

        }

    },
    parseErrorMessage: function (data, templatename) {

        const x = data.indexOf('<applicationexceptionobject>') + 28;
        const y = data.indexOf('</applicationexceptionobject>');
        const obj = JSON.parse(data.substr(x, y - x));

        return `Couldn't save template (${templatename}) \n${obj.message}`

    },
    hasFileCache(file_cache) {

        if (file_cache &&
            file_cache.input &&
            file_cache.input.email &&
            file_cache.input.project_name &&
            file_cache.token &&
            file_cache.authenticationInfo.authStatus == 'Success'
        ) {
            return true;
        }

        return false;

    }

}
