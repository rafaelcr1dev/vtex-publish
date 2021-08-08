const directory = "./";

const config = {
    import_dir: (input, path) => `./src/${path}/${input.project_name}`,
    hash: true,
    fileext: '*.jpg;*.png;*.gif;*.jpeg;*.ico;*.js;*.css;*.svg,*.pdf',
    directory: {
        css: (input, path) => directory + `src/${path}/${input.project_name}/arquivos/css`,
        js: (input, path) => directory + `src/${path}/${input.project_name}/arquivos/js`,
        pdf: (input, path) => directory + `src/${path}/${input.project_name}/arquivos/pdf`,
        xml: (input, path) => directory + `src/${path}/${input.project_name}/arquivos/xml`,
        images: (input, path) => directory + `src/${path}/${input.project_name}/arquivos/images`,
        shelfs: (input, path) => directory + `src/${path}/${input.project_name}/shelfs`,
        subTemplates: (input, path) => directory + `src/${path}/${input.project_name}/sub-templates`,
        templates: (input, path) => directory + `src/${path}/${input.project_name}/templates`,
        files: (input, path) => directory + `src/${path}/${input.project_name}/files`
    },
    urls: {
        baseURL: (input) => `https://${input.project_name}.vtexcommercestable.com.br`,
        auth: {
            start: (input) => `https://${input.project_name}.myvtex.com/api/vtexid/pub/authentication/start?locale=pt-BR&accountName=${input.project_name}&appStart=true&_=${new Date().getTime()}`,
            send: (input) =>  `https://${input.project_name}.myvtex.com/api/vtexid/pub/authentication/accesskey/send`,
            validate: (input) => `https://${input.project_name}.myvtex.com/api/vtexid/pub/authentication/accesskey/validate`,
            authentication: (input, authenticationToken) => `https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate?callback=jQuery21303445709204211189_1482672917153&login=${input.email}&authenticationToken=${authenticationToken}&password=${input.password}&_=${new Date().getTime()}`
        },
        html: {
            templates: (input) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/GetTemplateList?type=viewTemplate&IsSub=0`
        },
        fileManager: {
            addFile: (input, type) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/AddFile?fileType=${type}`,
            fileExists: (input) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/FilePicker/UploadFile`,
            upload: (input) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/FilePicker/UploadFile`,
            files: (input) => `https://${input.project_name}.myvtex.com/api/portal/pvt/sites/${input.environment_checkout}/files/`,
            templates: (input) => `https://${input.project_name}.myvtex.com/api/portal/pvt/sites/${input.environment_checkout}/templates/`,
            template: (input, templateName) => `https://${input.project_name}.myvtex.com/api/portal/pvt/sites/${input.environment_checkout}/templates/${templateName}`,
            getFiles: (input, type) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/HandleFileListByType/?siteId=undefined&fileType=${type}`
        },
        templates: {
            getTemplates: (input, type = 'viewTemplate', IsSub = 0) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/GetTemplateList?type=${type}&IsSub=${IsSub}`, // type=shelfTemplate&IsSub=1 // type=viewTemplate&IsSub=0 // ?type=viewTemplate&IsSub=1
            getTemplate: (input, templateId) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/TemplateContent?templateId=${templateId}`,
            getTemplateShelf: (input, shelfTemplateId) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/ShelfTemplateContent?shelfTemplateId=${shelfTemplateId}`,
            saveTemplate: (input) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/SaveTemplate`,
            saveShelf: (input) => `https://${input.project_name}.vtexcommercestable.com.br/admin/a/PortalManagement/SaveShelfTemplate`,
        }
    }
};

/*
Checkout templates (GET)
https://corebiz.myvtex.com/api/portal/pvt/sites/default/templates

https://corebiz.myvtex.com/api/portal/pvt/sites/default/templates/checkout-footer
*/

module.exports = config
