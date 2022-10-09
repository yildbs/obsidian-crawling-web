import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, parseYaml } from 'obsidian';
import { parseUrl } from "src/parser";


export default class ObsidianWebParser extends Plugin {
	async onload() {
		// This creates an icon in the left ribbon.
		this.addRibbonIcon(
			"zap",
			"Parse Web",
			async (evt: MouseEvent) => {
				// check current active file
				const file = this.app.workspace.getActiveFile();

				if (file.extension !== "md") {
					new Notice("This file is not md file, Please open md file");
					return;
				}

				if (!file) {
					new Notice("There's no active file, Please open new file");
					return;
				}

				// Called when the user clicks the icon.
				new Notice("Loading...");

				// Get first line
				const mdContent = await this.app.vault.read(file);
				const match = mdContent.match (/^---((?!---).)*---/s);
				if(match != null){
					const yamlDocument = match[0].slice(3, -3);
					const yaml = parseYaml(yamlDocument);
					const content = mdContent.slice(match[0].length)

					for (const [key, value] of Object.entries(yaml)) {
						if(value == null){
							yaml[key] = "";
						}
					}

					const result = await parseUrl(yaml, content);

					if(result[0]){
						new Notice(`Success`);
						this.app.vault.modify(file, result[1]);
					}
					else{
						new Notice(`Failed : ${result[1]}`);
					}
				}
			}
		);
	}

	onunload() {

	}
}
