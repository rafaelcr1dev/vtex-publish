const utils = require('./utils/utils.js');

const modules = {
    'Auth': require('./modules/auth/auth.js'),
    'Files': require('./modules/files/files.js'),
    'Templates': require('./modules/templates/templates.js')
}

async function init() {

    const auth = new modules.Auth();

        try {

            const files = new modules.Files();
            const templates = new modules.Templates();
            const authInfo = await auth.start();

            // I put this to check if the VtexIdclientAuCookie is valid!
            await templates.getTemplatesList(authInfo);

            utils.consoleMessage("\nAuthentication successfully completed, " + process.env.TYPE + " files now...", "green");
            utils.deleteFileLog();

            if(process.env.TYPE === "publish") {

                await files.publish(authInfo);
                await templates.publish(authInfo);

            } else if(process.env.TYPE === "import"){

                await files.import(authInfo);
                await templates.import(authInfo);
        
            } else if(process.env.TYPE === "watch"){

                console.log("watching...........");
        
            }

            utils.messageOfFinishProcess();

        } catch (e) {

            utils.deleteFileCache();

            utils.consoleMessage(e, 'red');

        }

}

init();
