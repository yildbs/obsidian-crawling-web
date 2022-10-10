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
            return [true, result[1]];
        }
        else if(url.search('yes24') != -1){
            const result = await parseYes24(yaml, content);
            return [true, result[1]];
        }
        else{
            return [false, "url not supported!"];
        }
    }
    catch(err){
        return [false, err];
    }
}

const parseYes24 = async (yaml: { [name: string]: string }, content: string) => {
    const url = yaml['parse-url'];
    const response = await requestUrl({
        url: url  
    });

    const parser = new DOMParser();
    const html = parser.parseFromString(response.text, "text/html");
    const yyyy_mm_dd = moment(new Date()).format().split("T")[0];
    const yyyymmdd = yyyy_mm_dd.replace("_", "");

    // https://github.com/kmsk99/kr-book-info-plugin
    let tags: string[] = [];
    html.querySelectorAll(
        "#infoset_goodsCate > div.infoSetCont_wrap > dl:nth-child(1) > dd > ul > li > a"
    ).forEach((value) => {
        tags.push(value.getText().replace(/(\s*)/g, ""));
    });
    tags = [...new Set(tags)];

    let title = html
        .querySelector(
            "#yDetailTopWrap > div.topColRgt > div.gd_infoTop > div > h2"
        )
        .getText()
        .replace(/\(.*\)/gi, "")
        .replace(/\[.*\]/gi, "")
        .replace(":", "：")
        .replace("?", "？")
        .trim();

    let subtitle = html.querySelector(
            "#yDetailTopWrap > div.topColRgt > div.gd_infoTop > div > h3"
        )
    if(subtitle == null){
        subtitle = "";
    }
    else{
        subtitle = subtitle
            .getText()
            .replace(/\(.*\)/gi, "")
            .replace(/\[.*\]/gi, "")
            .replace(":", "：")
            .replace("?", "？")
            .trim();
    }

    let authors: string[] = [];
    html.querySelectorAll(
        "#yDetailTopWrap > div.topColRgt > div.gd_infoTop > span.gd_pubArea > span.gd_auth"
    ).forEach((value) => {
        authors.push(value.getText().trim());
    });

    // let page = +html
    //     .querySelector(
    //         "#infoset_specific > div.infoSetCont_wrap > div > table > tbody > tr:nth-child(2) > td"
    //     )
    //     .getText()
    //     .split(" ")[0]
    //     .slice(0, -1);
    // if (isNaN(page)) page = 0;

    const datePublished = html
        .querySelector(
            "#yDetailTopWrap > div.topColRgt > div.gd_infoTop > span.gd_pubArea > span.gd_date"
        )
        .getText()
        .split(" ")
        .map((v) => v.slice(0, -1))
        .join("-");

    const coverUrl = html
        .querySelector(
            "#yDetailTopWrap > div.topColLft > div > span > em > img"
        )
        .getAttribute("src");

    yaml['title'] = title;
    yaml['subtitle'] = subtitle;
    yaml['publish_date'] = datePublished;
    yaml['tags'] = tags.join("\n");
    yaml['authors'] = authors.join("\n");
    // yaml['total_page'] = page;
    yaml['cover-url'] = coverUrl;
    yaml['start_study_date'] = yyyy_mm_dd;
    yaml['finish_study_date'] = yyyy_mm_dd;

    const yamlDocument = stringifyYaml(yaml).replace(" |-\n", "\n")
    const match = content.match (/@content/s);
    if(match != null){
        const start = match.index;
        const end = start + match[0].length;
        let newContent = ''
        newContent += `\n![Cover](${coverUrl})\n# ${title}\n\n`;
        newContent += `# ${title}\n\n`;
        newContent += `## 읽기 전 생각\n`;
        newContent += `  (읽기전 표지나 서문을 보고 든 생각)\n\n`;
        newContent += `## 읽으며 메모\n`;
        newContent += `  (읽으며 중간중간 필요한 내용 정리)\n\n`;
        newContent += `## 읽은 후 생각\n`;
        newContent += `  (읽은 후 첫 인상과 달랐거나 중요하게 생각한 부분)\n\n`;
        newContent += `## 목차\n`;
        newContent += `  (목차별 내용 요약 및 주석)\n\n`;
        newContent += `## Highlight\n`;
        newContent += `  (내용과 주석 중 중요하다고 생각한 부분)\n\n`;
        newContent += `## TODO\n`;
        newContent += `  실천목록(내가 이 책을 읽고 실천 할 수 있는 부분)\n\n`;

        content = content.slice(0, start) + newContent + content.slice(end);
    }
    content = `---\n${yamlDocument}\n---\n` + content;
    return [yaml, content];
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
    let authors : string[] = [];
    if (lenAuthors > 0){
        datePublished = cleanText(authorsElement[0].textContent);
        if(datePublished != null){
            title = `${title} (${datePublished})`;
        }
        for(let index=1;index<lenAuthors;index++){
            let author = cleanText(authorsElement[index].textContent);
            if(author != null && author.length >= 3){
                author = author.replace("-", "_").replace(" ", "_").toUpperCase();
                authors.push(author);
            }
        }
        authors = [...new Set(authors)];
    }

    let tasksElement = 
        html
        .querySelectorAll("#tasks > div > div.paper-tasks > div > div > a");
    const lenTasks = tasksElement.length;
    let tasks: string[] = [];
    for(let index=0;index<lenTasks;index++){
        let task = cleanText(tasksElement[index].textContent)?.replace("-", "_").replace(" ", "_").toUpperCase();
        tasks.push(task)
        tasks = [...new Set(tasks)];
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

    let keywords  : string[] = [];
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
    keywords = [...new Set(keywords)];


    yaml['title'] = title;
    yaml['publish_date'] = datePublished;
    yaml['creator'] = creator;
    yaml['genre'] = genre;
    yaml['tags'] = keywords.join("\n").toUpperCase();
    yaml['start_study_date'] = yyyy_mm_dd;
    yaml['finish_study_date'] = yyyy_mm_dd;
    yaml['duration'] = `${duration[0]}M ${duration[1]}S`;

    const yamlDocument = stringifyYaml(yaml).replaceAll(" |-\n", "\n")
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
