const Eta = require("eta")
const Marked = require("marked")

const { existsSync, readdirSync, lstatSync, readFileSync } = require("fs")
const { mkdir, cp, readFile, writeFile } = require("fs").promises
const { join, extname, basename, dirname } = require("path")

class EtaSSG{
    constructor(config){
        this.config = this.normalizePaths(config)
        this.tmp = {headings: []}
        this.eta = Eta
        this.marked = Marked

        ;(async () => {
            await this.init()
            await this.copyViewAssets()
            await this.convertMarkdownToHtml()
            this.createRouteList()
            await this.createPages()
            await this.copyAssets()
        })()
    }

    async copyAssets(){
        await Promise.all(
            this.config.assets.map(async (folderName) => {
                let path = join(this.config.root, folderName)
                if(!existsSync(path)) return

                
                let outputPath = join(this.config.output, folderName)
                return cp(path, outputPath, { recursive: true })
            })
        ).then(() => console.log("Finished: Copy Assets"))
    }

    async createPages(){
        await Promise.all(this.routes.map(async (route) => {
            let { filePath, savePath, relative, layout, folders, headings } = route
            let title = ["BuildPC.org", ...folders].map(v => capitalizeFirstLetter(v).replace("-", " ")).join(" - ")
            let params = { title, relative, headings }
    
            let page = await readFile(filePath, "utf-8")
    
            let html = layout == null ?
                Eta.render(page, params) :
                Eta.render(`<% layout("${layout}", ${JSON.stringify(params)}) %>${page}`, params)
    
            let folder = dirname(savePath)
            if(!existsSync(folder)) await mkdir(folder, { recursive: true })
            await writeFile(savePath, html)
        }))
            .then(() => console.log("Finished: Creating all pages."))
    }

    createRouteList(){
        const ROUTES = loadRoutes()
        let routeList = []
    
        const mkDir = (routes, paths) => {
            // Filter index files for routes.
            paths = paths.filter(v => v !== ".")
    
            for(let key in routes){
                let value = routes[key]
    
                if(typeof value === "string" || value.file){
                    let file = addExtToFilename(value)
                    let savePath = key === "." ?
                        [...paths, "index.html"].join("/") :
                        [...paths, rmExtFromFilename(file), "index.html"].join("/");
                    let folders = savePath.split("/").slice(2, -1)
        
                    routeList.push({
                        filePath: ["./tmp/views", file].join("/"),
                        savePath,
                        folders,
                        relative: "../".repeat(folders.length),
                        layout: value.layout || null,
                        file
                    })
                } else {
                    mkDir(value, [...paths, key])
                }
            }
        }
    
        mkDir(ROUTES, [this.config.output])

        this.routes = routeList.map(route => ({...route, headings: this.tmp.headings[route.file]}) )
    }

    async convertMarkdownToHtml(){
        let mdFiles = getFileList(this.config.markdown)
            .filter(v => extname(v) === ".md")

        if(!mdFiles) return console.log("Info: No markdown files found.")
        let headings = {}

        let promises = mdFiles.map(async (filePath) => {
            let data = await readFile(filePath, "utf-8")

            this.tmp.headings = []
            let html = this.marked.parse(data)
            let fileName = extname(filePath) ?
                basename(filePath).replace(".md", ".eta") :
                basename(filePath) + ".eta";
            
            headings[fileName] = this.tmp.headings

            await writeFile(join("./tmp/views", fileName), html)
        })

        await Promise.all(promises)
    }

    async copyViewAssets() {
        if(!existsSync(this.config.views)) return
        if(!existsSync("./tmp/views")) mkdir("./tmp/views")
        await cp(this.config.views, "./tmp/views", { recursive: true })
    }

    async init(){
        this.eta.configure({
            views: this.config.views
        })
        
        const walkTokens = (token) => {
            if(token.type !== "heading") return

            this.tmp.headings.push({
                text: token.text,
                link: token.text.replace(/[\s]+/g, "-").replace(/[\(\)\[\]\/\\]/g, "").toLowerCase()
            })
        }

        this.marked.use({ walkTokens })

        if(!existsSync("./tmp")) mkdir("./tmp")
    }

    normalizePaths(config){
        if(!config.root) return config

        const { root, views, markdown, assets } = config

        config.views = join(root, views)
        config.markdown = join(root, markdown)
        config.assets = assets.map(str => join(root, str))

        return config
    }
}

function addExtToFilename(value){
    let filename = value.file || value
    return extname(filename) ?
        filename :
        filename + ".eta";
}

function rmExtFromFilename(filename){
    return filename.replace(extname(filename), "")
}

function capitalizeFirstLetter(string){
    return string.charAt(0).toUpperCase() + string.slice(1)
}

function loadRoutes(){
    return JSON.parse(readFileSync("./src/routes.json", { encoding: "utf-8"}))
}

function getFileList(path){
    let fileList = []

    const readFolder = (parent) => {
        let folder = readdirSync(parent, { encoding: "utf-8" })

        folder.forEach(content => {
            let newContentPath = `${parent}/${content}`
            let isDir = lstatSync(newContentPath).isDirectory()

            if(!isDir) return fileList.push(newContentPath)

            readFolder(newContentPath)
        })
    }

    readFolder(path)

    return fileList
}

module.exports = EtaSSG