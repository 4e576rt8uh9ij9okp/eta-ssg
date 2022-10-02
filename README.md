# eta-ssg
ETA- SSG static site generator

# Folder Structure
    - src
    - routes.json
    - - css/
    - - img/
    - - markdown/
    - - views/

# index.js (entry)
    const EtaSSG = require("eta-ssg")
    new EtaSSG({
        root: "./src",          //Where all the underlying folders are (views, markdown, output etc)
        views: "views",         //Folder with Eta files.
        markdown: "markdown",   //Folder with Markdown files.
        output: "./www",        //Output foler with the finished website
        assets: ["css", "img"]  //Folders that will be copied 1:1 into output folder.
    })

# routes.json
    {
        ".": "home",
        "services": {
            ".": {
                "file": "servicesPage",
                "layout": "basicLayout"
            }
        },
        "about": "aboutPage"
    }

***"."*** as key represents the index of the folder, it will output "myproject/index.js"
***"service"*** will use the defined file and layout and output "myproject/service.html"
***"about"*** will output without a layout "myproject/about.html"
***"file"*** and "layout" are expected to be eta files. Only File can be also a markdown file.

# Build
    node index.js