import { requestUrl, stringifyYaml, Notice } from "obsidian";

let cleanText = function(text : string){
    if (text == null){
        return null;
    }

    return text
    .replace(/\(.*\)/gi, "")
    .replace(/\[.*\]/gi, "")
    .replace(":", "\uFF1A")
    .replace("?", "\uFF1F")
    .trim();
}


const parseUrl = async function(yaml: { [name: string]: string }, content: string){

    try{
        const url = yaml['parse-url'];
        if(url.search('youtube') != -1){
            const result = await parseYoutube(yaml, content);

            return [true, result[1]];
        }
        else if(url.search('paperswithcode') != -1){
            const result = await parsePaperswithcode(yaml, content);

            console.log(result);

            return [true, result[1]];
        }
        else{
            return [false, "ETC"];
        }
    }
    catch(err){
        return [false, err];
    }
}


const parsePaperswithcode = async (yaml: { [name: string]: string }, content: string) => {
    const url = yaml['parse-url'];
    const response = await requestUrl({
        url: url  
    });

    const parser = new DOMParser();
    const html = parser.parseFromString(response.text, "text/html");
    const yyyy_mm_dd = moment(new Date()).format().split("T")[0];
    const yyyymmdd = yyyy_mm_dd.replace("_", "");

    new Notice("start!!!! ");

    let title =
        html!
        .querySelector("body > div.container.content.content-buffer > main > div.paper-title > div > div > h1")!
        .textContent;
    if (title != null){
        title = cleanText(title);
    }

    let authorsElement = 
        html
        .querySelectorAll("body > div.container.content.content-buffer > main > div.paper-title > div > div > div > p > span");
    const lenAuthors = authorsElement.length;
    let datePublished = null;
    let authors = []
    if (lenAuthors > 0){
        datePublished = cleanText(authorsElement[0].textContent);
        if(datePublished != null){
            title = `${title} (${datePublished})`;
        }
        for(let index=1;index<lenAuthors;index++){
            let author = cleanText(authorsElement[index].textContent);
            if(author != null && author.length >= 3){
                author = author.replace("-", "_").replace(" ", "_").toUpperCase();
                if(authors.contains(author) == false){
                    authors.push(author);
                }
            }
        }
    }

    let tasksElement = 
        html
        .querySelectorAll("#tasks > div > div.paper-tasks > div > div > a");
    const lenTasks = tasksElement.length;
    let tasks = []
    for(let index=0;index<lenTasks;index++){
        let task = cleanText(tasksElement[index].textContent)?.replace("-", "_").replace(" ", "_").toUpperCase();
        if(tasks.contains(task)==false){
            tasks.push(task)
        }
    }

    let githubsElement = 
        html
        .querySelectorAll("#implementations-short-list > div");
    const lenGithubs = githubsElement.length;
    let gibhubs = []
    for(let index=0;index<lenGithubs;index++){
        let urlElement = githubsElement[index].querySelector("div.col-sm-7 > div > a");
        if(urlElement != null){
            gibhubs.push(urlElement.getAttribute("href"))
        }
    }

    yaml['title'] = title;
    yaml['publish_date'] = datePublished;
    yaml['tags'] = tasks.join("\n") + authors.join("\n");
    yaml['tasks'] = tasks.join("\n");
    yaml['authors'] = authors.join("\n");
    yaml['start_study_date'] = yyyy_mm_dd;
    yaml['finish_study_date'] = yyyy_mm_dd;

    const yamlDocument = stringifyYaml(yaml).replaceAll(" |-\n", "\n")
    content = `---\n${yamlDocument}\n---\n` + content;
    return [yaml, content];
};


const parseYoutube = async (yaml: { [name: string]: string }, content: string) => {
    const url = yaml['parse-url'];
    const response = await requestUrl({
        url: url
    });

    const parser = new DOMParser();
    const html = parser.parseFromString(response.text, "text/html");
    const yyyy_mm_dd = moment(new Date()).format().split("T")[0];
    const yyyymmdd = yyyy_mm_dd.replace("_", "");

    let title =
        html
        .querySelector("body div meta[itemprop='name']")!
        .getAttribute("content")!
        .replace(/\(.*\)/gi, "")
        .replace(/\[.*\]/gi, "")
        .replace(":", "：")
        .replace("?", "？")
        .trim();
        ;

    let datePublished = 
        html
        .querySelector("body div meta[itemprop='datePublished']")!
        .getAttribute("content")!
        .replace(/\(.*\)/gi, "")
        .replace(/\[.*\]/gi, "")
        .replace(":", "：")
        .replace("?", "？")
        .trim();
    
    let genre = 
        html
        .querySelector("body div meta[itemprop='genre']")!
        .getAttribute("content")!
        .replace(/\(.*\)/gi, "")
        .replace(/\[.*\]/gi, "")
        .replace(":", "：")
        .replace("?", "？")
        .trim();

    let duration = 
        html
        .querySelector("body div meta[itemprop='duration']")!
        .getAttribute("content")!
        .replace(/\(.*\)/gi, "")
        .replace(/\[.*\]/gi, "")
        .replace(":", "：")
        .replace("?", "？")
        .trim()
        .replace(/([a-zA-Z])/g, " ")
        .trim()
        .split(" ");

    let thumbnailUrl = 
        html
        .querySelector("body div link[itemprop='thumbnailUrl']")!
        .getAttribute("href");

    let creator = 
        html
        .querySelector("body div link[itemprop='name']")!
        .getAttribute("content")!
        .replace(/\(.*\)/gi, "")
        .replace(/\[.*\]/gi, "")
        .replace(":", "：")
        .replace("?", "？")
        .trim();
        ;

    let keywords = [];
    html
    .querySelector("head meta[name='keywords']")!
    .getAttribute("content")!
    .replace(/\(.*\)/gi, "")
    .replace(/\[.*\]/gi, "")
    .replace(":", "：")
    .replace("?", "？")
    .split(",")
    .forEach((k)=> {
        keywords.push(k.trim().replace(/ /g, "_"))
    });

    try{
        yaml['tags'].split(/ |\n/).forEach((t) =>{
            keywords.push(t);
        })
    }
    catch(err){}

    yaml['title'] = title;
    yaml['publish_date'] = datePublished;
    yaml['creator'] = creator;
    yaml['genre'] = genre;
    yaml['tags'] = keywords.join("\n").toUpperCase();
    yaml['start_study_date'] = yyyy_mm_dd;
    yaml['finish_study_date'] = yyyy_mm_dd;
    yaml['duration'] = `${duration[0]}M ${duration[1]}S`;

    const yamlDocument = stringifyYaml(yaml).replace("tags: |-", "tags:")
    const match = content.match (/@content/s);
    if(match != null){
        const start = match.index;
        const end = start + match[0].length;
        content = content.slice(0, start) + `\n![Cover](${thumbnailUrl})\n# ${title}\n` + content.slice(end);
    }
    content = `---\n${yamlDocument}\n---\n` + content;
    return [yaml, content];
};




export { parseUrl };
