const { createReadStream } = require('fs');
const cheerio = require('cheerio');
const apisauce = require('apisauce');
const request = require('request');
const imageDownloader = require('image-downloader');
const fs = require('fs');
const path = require('path');

const config = require("../../config/config.js");
const utils = require("../../utils/utils.js");
const vtexConfig = require('../../vtex.config.json');

class Files {

    async getRequestTokenHTML(dataInfo, type) {

        const baseURL = config.urls.baseURL(dataInfo.input);
        const cookie = utils.headerCookie(dataInfo.authenticationInfo);

        const api = apisauce.create({
            baseURL,
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': cookie,
            },
            timeout: 10000
        })

        return await api.post(config.urls.fileManager.addFile(dataInfo.input, type));

    }

    generateFormData(filePath, requestToken) {

        return {
            Filename: filePath,
            fileext: config.fileext,
            folder: '/uploads',
            Upload: 'Submit Query',
            requestToken: requestToken,
            Filedata: createReadStream(filePath)
        }

    }

    getRequestToken(requestTokenHTML) {

        const $ = cheerio.load(requestTokenHTML);

        return $('#fileUploadRequestToken').val();

    }

    async upload(authInfo, filePath, filename, type, total_files, index) {

        const { data } = await this.getRequestTokenHTML(authInfo, type);
        const requestToken = this.getRequestToken(data);
        const url = config.urls.fileManager.upload(authInfo.input);
        const cookie = utils.headerCookie(authInfo.authenticationInfo);
        const formData = this.generateFormData(filePath, requestToken);

        return await new Promise((resolve, reject) => {

            request.post({
                'url': url,
                'formData': formData,
                'headers': {
                    'Cookie': cookie
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (!httpResponse && ~filename.indexOf(".pdf")) {

                        resolve(
                            {
                                response: `(${index}/${total_files}) The file of ${type} ${filename} saved successfully.`,
                                error: false,
                                httpResponse: httpResponse
                            }
                        );

                    } else {

                        if (!httpResponse || !httpResponse.statusCode) throw new Error(`There was an error uploading file of ${type} ${filename}`);

                        const { statusCode, statusMessage, body } = httpResponse;

                        if (statusCode.toString().substr(0, 1) !== '2' ||
                            statusMessage != 'OK' ||
                            utils.stringToJson(body).fileNameInserted != filename ||
                            utils.stringToJson(body).mensagem != 'File(s) saved successfully.'
                        ) {
                            throw new Error(`There was an error uploading file of ${type} ${filename}`);
                        }

                        if (err) reject(err);

                        resolve(
                            {
                                response: `(${index}/${total_files}) The file of ${type} ${filename} saved successfully.`,
                                body: body,
                                error: false,
                                httpResponse: httpResponse
                            }
                        );

                    }

                } catch (e) {

                    resolve(
                        {
                            response: `(${index}/${total_files}) Couldn\'t save file: ${filename} :(`,
                            error: true,
                            httpResponse: httpResponse
                        }
                    );

                    utils.consoleMessage(e, 'red');

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

    async controlFilesUpload(authInfo, typeFile, directory, extensions) {

        const makeUploadsFiles = utils.makeUploads(typeFile);

        if (!makeUploadsFiles.isActive) return;

        const files = (makeUploadsFiles.files.length) ? makeUploadsFiles.files : this.getFiles(directory, extensions);
        const total_files = files.length;

        let upload_response = "";
        let filePath = "";
        let file = "";

        utils.consoleMessage(`\n(${total_files}) files ${typeFile} ${JSON.stringify(extensions)} to uploading file\n`, 'yellow');

        const spinner = utils.startLoading(`Uploading file... `, "yellow");

        for (let index in files) {

            try {

                file = files[index];
                filePath = directory + "/" + file;
                upload_response = await this.upload(authInfo, filePath, file, typeFile, total_files, ++index);

                if (upload_response.error) {

                    utils.consoleMessage(upload_response.response, 'red');

                } else {

                    utils.consoleMessage(upload_response.response, 'green');

                }

            } catch (err) {

                utils.consoleMessage(err, 'red');

            }

        }

        utils.stopLoading(spinner);

    }

    async getTemplate(authInfo, nameTemplate) {

        return new Promise((resolve, reject) => {

            const endpoint = config.urls.fileManager.templates(authInfo.input);
            const cookie = utils.headerCookie(authInfo.authenticationInfo);

            request({
                'method': 'GET',
                'url': endpoint + nameTemplate,
                'headers': {
                    'Cookie': cookie,
                    'Content-Type': 'application/json'
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (!httpResponse || !httpResponse.statusCode) throw new Error(`There was an error in the file ${type} ${filename}`);

                    const { statusCode, statusMessage } = httpResponse;

                    if (((statusCode.toString().substring(0, 1) == 2) &&
                        statusMessage == 'OK')) {

                        if (err) {
                            
                            reject(
                                { 
                                    response: error, 
                                    error: true, 
                                    err: err 
                                });

                        }

                        resolve(
                            { 
                                response: `(${index}/${total_files}) The file of ${type} HTML (${nameTemplate}) saved successfully.`, 
                                error: false, 
                                httpResponse: httpResponse, 
                                body: JSON.stringify(httpResponse.body) 
                            }
                        );

                    } else {

                        throw new Error(`Not exists template: ${nameTemplate} :(`);

                    }

                } catch (error) {

                    reject(
                        { 
                            response: error, 
                            error: true 
                        }
                    );

                }

            });

        });

    }

    async save(authInfo, reqData = {}, type, index, total_files) {

        const cookie = utils.headerCookie(authInfo.authenticationInfo);
        let method;
        let endpoint = (type == "files") ? config.urls.fileManager.files(authInfo.input) : config.urls.fileManager.templates(authInfo.input);
        
        if (type == "files") {

            method = 'PUT';
            endpoint += reqData.path || reqData.name

        } else {

            try {
                // Verify if exists templates
                await this.getTemplate(authInfo, reqData);
                method = 'PUT';
            } catch (e) {
                method = 'POST';
            }

        }

        // method = 'DELETE';
        // endpoint += reqData.path || reqData.name

        return new Promise((resolve, reject) => {

            request({
                'method': method,
                'url': endpoint,
                'json': reqData,
                'headers': {
                    'Cookie': cookie,
                    'Content-Type': 'application/json'
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (!httpResponse || !httpResponse.statusCode) throw new Error(`There was an error uploading file of ${type} ${reqData.path || reqData.name}`);

                    const { statusCode, statusMessage } = httpResponse;

                    if (((statusCode.toString().substring(0, 1) == 2) && statusMessage == 'OK') ||
                        (statusCode.toString().substring(0, 1) == 2) && statusMessage == 'Created') {

                        if (err) {
                            
                            reject(
                                { 
                                    response: error, 
                                    error: true, 
                                    err: err 
                                }
                            );

                        }

                        resolve(
                            { 
                                response: `(${index}/${total_files}) The file of ${type} HTML (${reqData.path || reqData.name}) saved successfully.`, 
                                error: false, 
                                httpResponse: httpResponse 
                            }
                        );

                    } else {

                        throw new Error(`(${index}/${total_files}) Couldn\'t save the template: ${reqData.path || reqData.name} :( ${method}`);

                    }

                } catch (error) {

                    reject(
                        { 
                            response: error, 
                            error: true 
                        }
                    );

                }

            });

        });

    }

    async saveFile(authInfo, filename, content, typeFile, total_files, index_current_file) {

        try {

            let reqData;

            if (typeFile == "files") {

                reqData = {
                    'path': filename,
                    'text': content,
                }

            } else {

                reqData = {
                    'name': utils.getNameFile(filename),
                    'body': content,
                }

            }

            const template_response = await this.save(authInfo, reqData, typeFile, total_files, index_current_file);
            const { response } = template_response;

            utils.consoleMessage(response, 'green');

        } catch (error) {

            const { response } = error;

            utils.consoleMessage(response, 'red');

        }

    }

    async controlFilesUploadCheckout(authInfo, typeFile, directory, extensions) {

        const makeUploadsFiles = utils.makeUploads(typeFile);

        if (!makeUploadsFiles.isActive) return;

        const files = (makeUploadsFiles.files.length) ? makeUploadsFiles.files : this.getFiles(directory, extensions);
        const total_files = files.length;

        let contentFile;
        let filePath = "";
        let file = "";

        utils.consoleMessage(`\n(${total_files}) files of type ${typeFile} ${JSON.stringify(extensions)} to uploading file\n`, 'yellow');

        const spinner = utils.startLoading(`Uploading file... `, "yellow");

        for (let index in files) {

            try {

                file = files[index];
                filePath = directory + "/" + file;
                contentFile = utils.readFileContent(filePath);

                await this.saveFile(authInfo, file, contentFile, typeFile, total_files, ++index);

            } catch (err) {

                utils.consoleMessage(err, 'red');

            }

        }

        utils.stopLoading(spinner);

    }

    filePathStoreToDownload(authInfo, filename, dirDownload){

        if (!authInfo || !filename || !dirDownload) return;

        return config.urls.baseURL(authInfo.input) + dirDownload + "/" + filename;

    }

    async download(url, fileName, dir, input){

        if (!url || !fileName || !dir) return;

        return imageDownloader.image({
            url: url,
            dest: `${config.import_dir(input, 'import')}/${dir + fileName}`,
            extractFilename: false
        });   
          
    }

    async downloadsControl(files, authInfo, dir, extensions, dirDownload){

        if (!files || !files.length || !authInfo || !dir || !extensions || !dirDownload) return;

        let filename;

        const total_files = files.length;

        utils.consoleMessage(`\n(${total_files}) files ${JSON.stringify(extensions)} to downloading\n`, 'yellow');

        const spinner = utils.startLoading(`Downloading file... `, "yellow");

        for (const file of files){

            filename = (file.cell) ? file.cell[1] : file;

            const fileSplit = filename.split(".");
            const extensionFile = fileSplit[fileSplit.length - 1];

            if (extensions.indexOf(extensionFile) <= -1 || filename.length > 40) continue;

            try {

                await this.download(this.filePathStoreToDownload(authInfo, filename, dirDownload), filename, dir, authInfo.input);
                utils.consoleMessage(`The file ${this.filePathStoreToDownload(authInfo, filename, dirDownload)} successfully downloaded`, 'green');

            } catch (error) {

                // console.log(error)
                utils.consoleMessage(`There a error on download of file: ${this.filePathStoreToDownload(authInfo, filename, dirDownload)}`, 'red');
    
            }

        }

        utils.stopLoading(spinner);

    }

    async getFilesToImport(authInfo, type) {

        const url = config.urls.fileManager.getFiles(authInfo.input, type);
        const cookie = utils.headerCookie(authInfo.authenticationInfo);
        const formData = {
            page: 1,
            rp: 100,
            sortname: "IdArquivo",
            sortorder: "desc",
            query: vtexConfig.import.templates.prefix,
            qtype: "Nome"
        }

        return await new Promise((resolve, reject) => {

            request.post({
                'url': url,
                'formData': formData,
                'headers': {
                    'Cookie': cookie
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                try {

                    if (err) throw new Error(`There was an error get file type ${type}`);

                    resolve(
                        {
                            response: JSON.parse(httpResponse.body),
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

    async getFilesCheckoutToImport(authInfo) {

        const url = config.urls.fileManager.files(authInfo.input);
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
                            response: JSON.parse(httpResponse.body),
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

    async controlFilesImport(authInfo){

        try {

            const filesCSS = await this.getFilesToImport(authInfo, "css");
            const filesJS = await this.getFilesToImport(authInfo, "js");
            const filesImages = await this.getFilesToImport(authInfo, "images");
            const filesPDF = await this.getFilesToImport(authInfo, "pdf");
            const filesXML = await this.getFilesToImport(authInfo, "xml");
            const filesCheckout = await this.getFilesCheckoutToImport(authInfo);

            await this.downloadsControl(filesCSS.response.rows, authInfo, 'arquivos/css/', ['css'], "/arquivos");
            await this.downloadsControl(filesJS.response.rows, authInfo, 'arquivos/js/', ['js'], "/arquivos");
            await this.downloadsControl(filesImages.response.rows, authInfo, 'arquivos/images/', ['jpg', 'png', 'gif', 'jpeg', 'ico', 'svg'], "/arquivos");
            await this.downloadsControl(filesPDF.response.rows, authInfo, 'arquivos/pdf/', ['pdf'], "/arquivos");
            await this.downloadsControl(filesXML.response.rows, authInfo, 'arquivos/xml/', ['xml'], "/arquivos");
            await this.downloadsControl(filesCheckout.response, authInfo, 'files/', ['css', 'js'], "/files");

        } catch (err){

            utils.consoleMessage(err, 'red');

        }

    }

    deleteFile(dir, file) {
        return new Promise((resolve, reject) => {
            const filePath = path.join(dir, file);

            fs.lstat(filePath, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                if (stats.isDirectory()) {
                    resolve(this.deleteDirectory(filePath));
                } else {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                }
            });
        });
    }

    async deleteDirectory(dir) {
        return new Promise((resolve, reject) => {
            fs.access(dir, (err) => {
                if (err) {
                    return reject(err);
                }
                fs.readdir(dir, (err, files) => {
                    if (err) {
                        return reject(err);
                    }
                    Promise.all(files.map((file) => {
                        return this.deleteFile(dir, file);
                    })).then(() => {
                        fs.rmdir(dir, (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    }).catch(reject);
                });
            });
        });
    }

    async createDirectory (dir){

        if (!dir) return;
        
        if (!fs.existsSync(dir)){

            return fs.mkdirSync(dir);

        }

    }

    async generateStructDirectoryToImport (input){

        await this.createDirectory(config.import_dir(input, 'import'));
        await this.createDirectory(config.import_dir(input, 'import') + "/arquivos");
        await this.createDirectory(config.import_dir(input, 'import') + "/arquivos/css");
        await this.createDirectory(config.import_dir(input, 'import') + "/arquivos/images");
        await this.createDirectory(config.import_dir(input, 'import') + "/arquivos/js");
        await this.createDirectory(config.import_dir(input, 'import') + "/arquivos/pdf");
        await this.createDirectory(config.import_dir(input, 'import') + "/arquivos/xml");
        await this.createDirectory(config.import_dir(input, 'import') + "/files");
        await this.createDirectory(config.import_dir(input, 'import') + "/shelfs");
        await this.createDirectory(config.import_dir(input, 'import') + "/sub-templates");
        await this.createDirectory(config.import_dir(input, 'import') + "/templates");

    }
       
    async publish(authInfo) {

        if (authInfo.authenticationInfo.authStatus != 'Success') return;

        await this.controlFilesUpload(authInfo, "images", config.directory.images(authInfo.input, 'publish'), ['jpg', 'png', 'gif', 'jpeg', 'ico', 'svg']);
        await this.controlFilesUpload(authInfo, "css", config.directory.css(authInfo.input, 'publish'), ['css']);
        await this.controlFilesUpload(authInfo, "js", config.directory.js(authInfo.input, 'publish'), ['js']);
        await this.controlFilesUpload(authInfo, "xml", config.directory.xml(authInfo.input, 'publish'), ['xml']);
        await this.controlFilesUpload(authInfo, "pdf", config.directory.pdf(authInfo.input, 'publish'), ['pdf']);
        await this.controlFilesUploadCheckout(authInfo, "files", config.directory.files(authInfo.input, 'publish'), ['css', 'js', 'json']);
        await this.controlFilesUploadCheckout(authInfo, "files_templates", config.directory.files(authInfo.input, 'publish'), ['html']);

    }

    async import(authInfo) {

        if (authInfo.authenticationInfo.authStatus != 'Success') return;

        try {

            await this.deleteDirectory(config.import_dir(authInfo.input, 'import'));

        } catch (err) {

            console.log(`Directory ${config.import_dir(authInfo.input, 'import')} can't be removed!`);

        }

        await this.generateStructDirectoryToImport(authInfo.input);
        await this.controlFilesImport(authInfo);

    }

}

module.exports = Files;
