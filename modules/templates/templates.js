const config = require('../../config/config.js');
const utils = require('../../utils/utils.js');
const createHash = require("crypto").createHash;
const cheerio = require('cheerio');
const request = require('request');

let filesTemplates;
let filesSubTemplates;

class Templates {

    async getTemplatesList(authInfo) {

        const cookie = utils.headerCookie(authInfo.authenticationInfo);
        const endpoint = config.urls.templates.getTemplates(authInfo.input);

        return await new Promise((resolve, reject) => {

            request.post({
                'url': endpoint,
                'headers': {
                    'Cookie': cookie,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (err) reject(err);

                    if (!httpResponse || httpResponse.statusCode != 200) {

                        if (httpResponse.statusCode == 302)
                            utils.deleteFileCache();

                        throw new Error('Invalid AutCookie VtexIdclientAutCookie!');

                    }

                    resolve(httpResponse);

                } catch (e) {

                    reject(e);

                }

            });

        });

    }

    getTemplateId(templates, templateName) {

        const template = templates.response.filter((item) => {
            if (item.name === templateName)
                return item;
        });

        return (template.length) ? template[0].templateId : createHash('md5').update(templateName).digest('hex');
    }

    save(authInfo, reqData = {}, type, index, total_files) {

        const cookie = utils.headerCookie(authInfo.authenticationInfo);
        let endpoint = config.urls.templates.saveTemplate(authInfo.input);

        if (type === 'shelf' || type === 'shelfTemplate') {

            endpoint = config.urls.templates.saveShelf(authInfo.input);

            reqData.roundCorners = "false";
            reqData.templateCssClass = "vitrine prateleira " + reqData.templateName.toString().substring(0, 8);

        }

        return new Promise((resolve, reject) => {

            request.post({
                'url': endpoint,
                'formData': reqData,
                'headers': {
                    'Cookie': cookie,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    const { statusCode, statusMessage } = httpResponse;

                    if ((statusCode != 200 || statusMessage != 'OK')) {
                        throw new Error(`(${index}/${total_files}) Couldn't save template: ${reqData.templateName} :(`);
                    }

                    if (err) throw new Error(`(${index}/${total_files}) Couldn't save template: ${reqData.templateName} :(`);

                    resolve(
                        { 
                            response: `(${index}/${total_files}) The file of ${type} HTML (${reqData.templateName}) saved successfully.`, 
                            error: false, 
                            httpResponse: httpResponse 
                        }
                    );

                } catch (error) {

                    reject(
                        { 
                            response: error, 
                            error: true, 
                            httpResponse: httpResponse 
                        }
                    );

                }

            });

        });

    }

    getFiles(directory, extensions) {

        let files = utils.getFilesOfDirectory(directory);

        files = files.filter((file) => {

            if (extensions.includes(utils.getExtensionFile(file)))
                return file;

        });

        return files;

    }

    insertHashVersionInfilesCssAndJsOfTemplates(html) {

        if (!html || !config.hash) return html;

        const time = new Date().getTime();

        html = html.toString().replace(/\?v=[0=9]{0,}/g, "");
        html = html.toString().replace(/\.css/g, ".css?v=" + time);
        html = html.toString().replace(/\.js/g, ".js?v=" + time);

        return html;

    }

    async controlTemplates(authInfo, typeFile, isSub, directory) {

        const makeUploadsTemplates = utils.makeUploads(typeFile);

        if (!makeUploadsTemplates.isActive) return;

        const extensions = ['html'];
        const files = (makeUploadsTemplates.files.length) ? makeUploadsTemplates.files : this.getFiles(directory, extensions);
        const total_files = files.length;

        let contentHTML;
        let nameFile;
        let filePath = "";
        let file = "";

        utils.consoleMessage(`\n(${total_files}) files ${typeFile} ${JSON.stringify(extensions)} to save\n`, 'yellow');

        const spinner = utils.startLoading(`Saving file(s)... `, "yellow");

        for (let index in files) {

            try {

                file = files[index];
                filePath = directory + "/" + file;
                contentHTML = this.insertHashVersionInfilesCssAndJsOfTemplates(utils.readFileContent(filePath));
                nameFile = utils.getNameFile(file);

                if (!contentHTML) throw new Error(`The ${typeFile} (${file}) not found :(`);

                await this.saveTemplate(authInfo, nameFile, contentHTML, typeFile, isSub, total_files, ++index, "Save");

            } catch (err) {

                utils.consoleMessage(err, 'red');

            }

        }

        utils.stopLoading(spinner);

    }

    async saveTemplate(authInfo, templateName, HTML, typeFile, isSub, total_files, index_current_file, actionForm) {

        const templates = (isSub === 'False') ? filesTemplates : filesSubTemplates;

        try {

            const reqData = {
                'templateName': templateName,
                'templateId': this.getTemplateId(templates, templateName),
                'template': HTML,
                'actionForm': actionForm, // 'Save' | 'Update'
                'isSub': isSub,
                'textConfirm': 'yes',
            }

            const template_response = await this.save(authInfo, reqData, typeFile, total_files, index_current_file);
            const { response, httpResponse } = template_response;
            const { body } = httpResponse;

            if (~body.indexOf('already exists')) {

                await this.saveTemplate(authInfo, templateName, HTML, typeFile, isSub, total_files, index_current_file, 'Update');

            } else {

                if (~body.indexOf('originalMessage')) throw new Error(utils.parseErrorMessage(body, templateName));

            }

            utils.consoleMessage(response, 'green');

        } catch (error) {

            utils.consoleMessage(error.toString().replace('[object Object]', ''), 'red');

        }

    }

    getParams(name, href) {

        if (!name) return false;
    
        href = href || window.location.href;
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    
        const regexS = "[\\?&]" + name + "=([^&#]*)";
        const regex = new RegExp(regexS);
        const results = regex.exec(href);
    
        if (results == null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    
    }

    convertResponseOfTemplatesInJSON(responseHTML){

        if (!responseHTML || !responseHTML.body) return "";

        const self = this;
        const json = [];
        const $ = cheerio.load(responseHTML.body);

        $(".jqueryFileTreeBody li").each(function() {

            const $this = $(this);
            const templateName = $this.find("div").text();

            if (utils.hasPrefixInTemplate(templateName)) {

                json.push({
                    templateId: self.getParams("templateId", $this.find("a").attr("href")),
                    name: templateName
                });

            }

        });

        return json;

    }

    async getTemplatesToImport(authInfo, type, IsSub) {

        const url = config.urls.templates.getTemplates(authInfo.input, type, IsSub);
        const cookie = utils.headerCookie(authInfo.authenticationInfo);

        return await new Promise((resolve, reject) => {

            request.post({
                'url': url,
                'headers': {
                    'Cookie': cookie
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (err) throw new Error(`There was an error get file type ${type}`);

                    resolve(
                        {
                            response: this.convertResponseOfTemplatesInJSON(httpResponse),
                            error: false
                        }
                    );

                } catch (e) {

                    reject({
                        response: e,
                        error: true
                    });

                    utils.consoleMessage(e, 'red');

                }

            });

        });

    }

    async getTemplatesFilesManagerToImport(authInfo, type) {

        const url = config.urls.fileManager.templates(authInfo.input);
        const cookie = utils.headerCookie(authInfo.authenticationInfo);

        return await new Promise((resolve, reject) => {

            request.get({
                'url': url,
                'headers': {
                    'Cookie': cookie
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (err) throw new Error(`There was an error get file type ${type}`);

                    resolve(
                        {
                            response: httpResponse.body,
                            error: false
                        }
                    );

                } catch (e) {

                    reject({
                        response: e,
                        error: true
                    });

                    utils.consoleMessage(e, 'red');

                }

            });

        });

    }

    getContentHtmlOfResponse(requestTokenHTML){

        if (!requestTokenHTML || !requestTokenHTML.body) return;

        const $ = cheerio.load(requestTokenHTML.body);

        return $('#originalTemplate').val();

    }

    async getContentTemplate(authInfo, file, type){

        if (!authInfo || !file || !type) return;

        let url;

        if (type == "template" || type == "sub-template") {

            url = config.urls.templates.getTemplate(authInfo.input, file.templateId);

        } else if (type == "shelf"){

            url = config.urls.templates.getTemplateShelf(authInfo.input, file.templateId);

        }

        const cookie = utils.headerCookie(authInfo.authenticationInfo);

        return await new Promise((resolve, reject) => {

            request.post({
                'url': url,
                'headers': {
                    'Cookie': cookie
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (err) throw new Error(`There was an error get file type ${type}`);

                    resolve(
                        {
                            response: this.getContentHtmlOfResponse(httpResponse),
                            error: false
                        }
                    );

                } catch (e) {

                    reject({
                        response: e,
                        error: true
                    });

                    utils.consoleMessage(e, 'red');

                }

            });

        });

    }

    async getContentFilesManagerWriteTemplate(authInfo, file, type){

        if (!authInfo || !file || !type) return;

        const url = config.urls.fileManager.template(authInfo.input, file);

        const cookie = utils.headerCookie(authInfo.authenticationInfo);

        return await new Promise((resolve, reject) => {

            request.get({
                'url': url,
                'headers': {
                    'Cookie': cookie
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (err) throw new Error(`There was an error get file type ${type}`);

                    resolve(
                        {
                            response: JSON.parse(httpResponse.body).body,
                            error: false
                        }
                    );

                } catch (e) {

                    reject({
                        response: e,
                        error: true
                    });

                    utils.consoleMessage(e, 'red');

                }

            });

        });

    }

    async controlWriteFiles(files, authInfo, dir, type){

        if (!files || !files.length || !authInfo || !dir || !type) return;

        const total_files = files.length;

        utils.consoleMessage(`\n(${total_files}) ${type} to downloading\n`, 'yellow');

        const spinner = utils.startLoading(`Downloading file... `, "yellow");

        for (const file of files){

            try {

                const contentTemplate = await this.getContentTemplate(authInfo, file, type);

                await utils.rewriteFile(dir + file.name + ".html", contentTemplate.response);

                utils.consoleMessage(`The file(${type}) ${file.name} successfully downloaded`, 'green');

            } catch (error) {

                utils.consoleMessage(`There a error on download of file(${type}): ${file.name}`, 'red');

            }

        }

        utils.stopLoading(spinner);

    }

    async controlFilesManagerWriteFiles(files, authInfo, dir, type){

        files = JSON.parse(files);

        if (!files || !files.length || !authInfo || !dir || !type) return;

        const total_files = files.length;

        utils.consoleMessage(`\n(${total_files}) ${type} to downloading\n`, 'yellow');

        const spinner = utils.startLoading(`Downloading file... `, "yellow");

        for (const index in files){

            try {

                const file = files[index];
                const contentTemplate = await this.getContentFilesManagerWriteTemplate(authInfo, file, type);

                await utils.rewriteFile(dir + file + ".html", contentTemplate.response);

                utils.consoleMessage(`The file(${type}) ${file} successfully downloaded`, 'green');

            } catch (error) {

                utils.consoleMessage(`There a error on download of file(${type}): ${file}`, 'red');

            }

        }

        utils.stopLoading(spinner);

    }

    async controlTemplatesImport(authInfo){

        try {

            const filesTemplates = await this.getTemplatesToImport(authInfo, "viewTemplate");
            const filesSubTemplates = await this.getTemplatesToImport(authInfo, "viewTemplate", 1);
            const filesShelfs = await this.getTemplatesToImport(authInfo, "shelfTemplate", 1);
            const filesManagerTemplates = await this.getTemplatesFilesManagerToImport(authInfo, "filesManagerTemplates");

            await this.controlWriteFiles(filesTemplates.response, authInfo, config.directory.templates(authInfo.input, 'import') + "/", "template");
            await this.controlWriteFiles(filesSubTemplates.response, authInfo, config.directory.subTemplates(authInfo.input, 'import') + "/", "sub-template");
            await this.controlWriteFiles(filesShelfs.response, authInfo, config.directory.shelfs(authInfo.input, 'import') + "/", "shelf");
            await this.controlFilesManagerWriteFiles(filesManagerTemplates.response, authInfo, config.directory.files(authInfo.input, 'import') + "/", "filesManagerTemplates");
            
        } catch (err){

            utils.consoleMessage(err, 'red');

        }

    }

    async publish(authInfo) {

        if (authInfo.authenticationInfo.authStatus != 'Success') return;

        filesTemplates = await this.getTemplatesToImport(authInfo, "viewTemplate");
        filesSubTemplates = await this.getTemplatesToImport(authInfo, "viewTemplate", 1);

        await this.controlTemplates(authInfo, 'templates', 'False', config.directory.templates(authInfo.input, 'publish'));
        await this.controlTemplates(authInfo, 'sub_templates', 'True', config.directory.subTemplates(authInfo.input, 'publish'));
        await this.controlTemplates(authInfo, 'shelf', 'True', config.directory.shelfs(authInfo.input, 'publish'));

    }

    async import(authInfo){

        if (authInfo.authenticationInfo.authStatus != 'Success') return;

        await this.controlTemplatesImport(authInfo);

    }

}

module.exports = Templates;
