// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

const vscode = require('vscode');
const path = require('path');

/*

https://code.visualstudio.com/api/extension-guides/web-extensions


The opened workspace or folder is on a virtual file system. 
Access to workspace files needs to go through the VS Code file 
system API accessible at vscode.workspace.fs.
*/

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */



// Define a sample TreeDataProvider
class MyTreeDataProvider {
    constructor(context) {
		this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    getTreeItem(element) {
        return {
            label: element.label,
			pt: element.pt,
			iconPath: new vscode.ThemeIcon("file"),
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

	getChildren() {
        return vscode.workspace.findFiles('**/*.json',  'node_modules/**').then(files => {
            return files.map(file => {
				const relativePath = vscode.workspace.asRelativePath(file.path);
                return {
                    label: relativePath, pt: file.path
                };
            });
        });
    }

	_onDidChangeTreeData = new vscode.EventEmitter();
  	onDidChangeTreeData = this._onDidChangeTreeData.event;

	refresh() {
		this._onDidChangeTreeData.fire();
	}
}
let treeDataProvider;
function createTreeView(context) {
	treeDataProvider = new MyTreeDataProvider(context);
    const treeView = vscode.window.createTreeView('codeflowdiag.myTreeView', {
        treeDataProvider,
		showCollapseAll: true
    });

    return treeView;
}

function writeToFile(filePath, data) {
    const uri = vscode.Uri.file(filePath);
    const buffer = Buffer.from(data);

    vscode.workspace.fs.writeFile(uri, buffer)
        .then(() => {
            vscode.window.showInformationMessage('Data written to file successfully.');
        })
        .catch(error => {
            vscode.window.showErrorMessage('Error writing to file: ' + error.message);
        });
}

function activate(context) {
	
	// for "when" in menus of editor/context
	vscode.commands.executeCommand('setContext', 'extensionActivated', true);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(`Congratulations, Eugene, your extension ${context.extension.id} is now active!`);
	vscode.window.showInformationMessage(`Congratulations, Eugene, your extension ${context.extension.id} is now active!`);

	let commandTDRefresh = vscode.commands.registerCommand('treeDataProvider.refresh', (link) => {
		treeDataProvider.refresh();
	});
	context.subscriptions.push(commandTDRefresh); 


	// Some vs code api command
	let commandListFiles = vscode.commands.registerCommand('codeflowdiag.listFiles', (p, nodeId) => {
		
		vscode.window.showInformationMessage('workspace: ' + vscode.workspace.name);
		vscode.workspace.findFiles('**/*', '**​/node_modules/**', 10).then((uris) => {
			// Map each URI to a relative path
			// const relativePaths = uris.map((uri) => vscode.workspace.asRelativePath(uri));
			p.webview.postMessage({ command: 'listFiles', data: uris, nodeId: nodeId});
		});
	});
	context.subscriptions.push(commandListFiles);

	let commandOpenLink = vscode.commands.registerCommand('codeflowdiag.linkClicked', (link) => {
		vscode.window.showInformationMessage('ext clicked link: ' + link);
		openEditorWithRelativePath(link.split('#')[0], link.split('#')[1]);
	});
	context.subscriptions.push(commandOpenLink); 

	// Copy relative path of source file opened in the current editor tab 
	// (with #lines of selection first and last)
	let disposableCSPAction = vscode.commands.registerCommand('codeflowdiag.copySrcPathAction', () => {
        // Add your custom action logic here
        vscode.window.showInformationMessage('Custom action executed!');
		const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Get the URI of the active text editor's document
            const documentUri = editor.document.uri;

            // Convert the document URI to a relative file path
            const relativeFilePath = vscode.workspace.asRelativePath(documentUri);
            
            // Use the relative file path
            vscode.window.showInformationMessage('Relative file path: ' + relativeFilePath);

			// Get the selected text range
			const selection = editor.selection;

			// Get the start and end line numbers of the selected text
			const startLine = selection.start.line + 1;
			const endLine = selection.end.line + 1;
            vscode.window.showInformationMessage(`start end lines: ${startLine} ${endLine}`);
			let linkText = relativeFilePath + `#L${startLine}-L${endLine}`;
			// https://vscode.dev/github/eugenner/Fractals3DV2/blob/main/index.html#L64-L70
			vscode.env.clipboard.writeText(linkText).then(() => {
				// Successful copy
				vscode.window.showInformationMessage('Copied to clipboard!');
			}, (err) => {
				// Handle errors if any
				vscode.window.showErrorMessage('Failed to copy to clipboard: ' + err);
			});

        } else {
            vscode.window.showErrorMessage('No active text editor.');
        }
    });
    context.subscriptions.push(disposableCSPAction);

	let disposableSDAction = vscode.commands.registerCommand('codeflowdiag.saveDiag', (content) => {
		fileName = JSON.parse(content).metaData.fileName;
        // Add your custom action logic here
        vscode.window.showInformationMessage('Save file: ' + fileName);
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder opened.');
			return;
		}
	
		const workspacePath = workspaceFolders[0].uri.fsPath;
		const filePath = path.join(workspacePath, fileName);
		vscode.window.showInformationMessage(`File ${fileName} save started.`);
		writeToFile(filePath, content);
		treeDataProvider.refresh();
    });
    context.subscriptions.push(disposableSDAction);	
	
	let panel;
	let webview = vscode.commands.registerCommand('codeflowdiag.runIt', () => {
		vscode.commands.executeCommand('setContext', 'extensionActivated', true);
		panel = prepareWebView(context);
		vscode.window.showInformationMessage('showing webview 2');
		const treeView = createTreeView(context);
		context.subscriptions.push(webview, treeView);
		panel.onDidDispose(() => {
			vscode.commands.executeCommand('setContext', 'extensionActivated', false);
			// panel.webview.deactivate();
			// treeView.dispose();
			
		});
		// Listen for messages from the webview
		panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'listFiles':
				 	vscode.commands.executeCommand('codeflowdiag.listFiles', panel, message.nodeId); // should be "panel" passed this way?
					vscode.window.showInformationMessage('executeCommand listFiles id: ' + message.nodeId);
					break;
				case 'linkClicked':
					vscode.commands.executeCommand('codeflowdiag.linkClicked', message.link);
					break;
				case 'saveDiag':
					console.log('saveDiag');
					vscode.commands.executeCommand('codeflowdiag.saveDiag', message.data);
					break;

			}
		})
	});

	let disposableOTVIAction = vscode.commands.registerCommand('codeflowdiag.OpenTreeViewItem', (item) => {
        vscode.window.showInformationMessage('Open action executed! ' + item.pt);
		const uri = vscode.Uri.file(item.pt);
		vscode.workspace.fs.readFile(uri).then(fileContent => {
			const contentString = Buffer.from(fileContent).toString('utf-8');
			const fileName = vscode.workspace.asRelativePath(item.pt);
			panel.webview.postMessage({ command: 'loadDiag', data: contentString, fileName: fileName});
		}).catch(error => {
			console.error('Error loading file:', error);
		});
	})
	context.subscriptions.push(disposableOTVIAction);
}

async function openEditorWithRelativePath(relativePath, positionInDocument) {
    try {
        // Construct the absolute path by joining the workspace root path and the relative path
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]; // Assuming you have only one workspace folder
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }
        
        const absolutePath = path.join(workspaceFolder.uri.fsPath, relativePath);

        // Convert the absolute path to a URI
        const uri = vscode.Uri.file(absolutePath);

        // Open the text document associated with the provided URI
        const document = await vscode.workspace.openTextDocument(uri);

        // Show the opened document in an editor
		let lineNumber = parseInt(positionInDocument.substring(1));
        await vscode.window.showTextDocument(document,
			{ selection: new vscode.Range(lineNumber, 0, lineNumber, 0) });

    } catch (error) {
        // Handle any errors
        vscode.window.showErrorMessage('Failed to open document: ' + error);
    }
}

function prepareWebView(context) {

	const newPanel = vscode.window.createWebviewPanel(
		"Code Flow Diag",
		"CodeFlowDiag",
		vscode.ViewColumn.One,
		{	
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [
                vscode.Uri.file(
                    path.join(context.extensionPath, "dist", "vue-dist", "assets")
                ),
            ],
		}
	);

	// const container = newPanel.webview.container;
	// container.addEventListener('dragstart', () => {
	// 	console.log('Container dragstart!');
	// });

	// type-hierarchy-sub
	newPanel.iconPath = vscode.Uri.file(context.asAbsolutePath('./hierarchy-6.png'));
	// newPanel.iconPath = (new vscode.ThemeIcon('globe')).filePath;
	// const globeIcon = new vscode.ThemeIcon('globe');
	// newPanel.iconPath = vscode.ThemeIcon.Globe;

	// newPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'icons', 'cat.png'));

	const dependencyNameList = [
        "index.css",
        "index.js"
    ];
    const dependencyList = dependencyNameList.map((item) =>
		newPanel.webview.asWebviewUri(
            vscode.Uri.file(
                path.join(context.extensionPath, "dist", "vue-dist", "assets", item)
            )  
        )
    );
	newPanel.webview.html = `<!DOCTYPE html>
	<html lang="en">
	<head>
	  <meta charset="UTF-8" />
	  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
	  <title>Vite App</title>
	  <script>
			const vscode = acquireVsCodeApi();
	  </script>
	  <script type="module" crossorigin src="${dependencyList[1]}"></script>
	  <link rel="stylesheet" href="${dependencyList[0]}">
	</head>
	<body>
	  <div id="app"></div>
	</body>
	</html>
	`;

	return newPanel;
}

// TODO how to call this
function deactivate() {
	console.log('deactivate');
	vscode.commands.executeCommand('setContext', 'extensionActivated', false);
 }

module.exports = {
	activate,
	deactivate
}