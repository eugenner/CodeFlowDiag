
const vscode = require('vscode');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */

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

	getChildren(element) {
		return vscode.workspace.findFiles('**/*.json', 'node_modules/**').then(async files => {
			const filteredFiles = [];
			for (const fileUri of files) {
				const readData = await vscode.workspace.fs.readFile(fileUri);
				const readStr = Buffer.from(readData).toString('utf8');
				if (readStr.substring(0, 12) === '{"diagData":') {
					filteredFiles.push(fileUri);
				}
			}

			return filteredFiles.map(file => {
				const relativePath = vscode.workspace.asRelativePath(file.path);
				return {
					label: relativePath, pt: file.path
				};
			}).sort((el1, el2) => el1.label.localeCompare(el2.label));
		});
	}

	refresh() {
		this._onDidChangeTreeData.fire();
	}
}
let treeDataProvider;
function createTreeView(context) {
	treeDataProvider = new MyTreeDataProvider(context);
	const treeView = vscode.window.createTreeView('codeflowdiag.myTreeView', {
		treeDataProvider,
		showCollapseAll: false
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

	vscode.commands.executeCommand('setContext', 'extensionActivated', true);
	let commandTDRefresh = vscode.commands.registerCommand('treeDataProvider.refresh', (link) => {
		treeDataProvider.refresh();
	});
	context.subscriptions.push(commandTDRefresh);

	let commandListFiles = vscode.commands.registerCommand('codeflowdiag.listFiles', (p, nodeId) => {
		vscode.window.showInformationMessage('workspace: ' + vscode.workspace.name);
		vscode.workspace.findFiles('**/*', '**​/node_modules/**').then((uris) => {
			// Map each URI to a relative path
			// const relativePaths = uris.map((uri) => vscode.workspace.asRelativePath(uri));
			p.webview.postMessage({ command: 'listFiles', data: uris, nodeId: nodeId });
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
			vscode.env.clipboard.writeText(linkText).then(() => {
				vscode.window.showInformationMessage('Copied to clipboard!');
			}, (err) => {
				vscode.window.showErrorMessage('Failed to copy to clipboard: ' + err);
			});

		} else {
			vscode.window.showErrorMessage('No active text editor.');
		}
	});
	context.subscriptions.push(disposableCSPAction);

	let disposableSDAction = vscode.commands.registerCommand('codeflowdiag.saveDiag', (content) => {
		fileName = JSON.parse(content).metaData.fileName;
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder opened.');
			return;
		}
		const workspacePath = workspaceFolders[0].uri.fsPath;
		const filePath = path.join(workspacePath, fileName);
		vscode.window.showInformationMessage(`Saving ${fileName}`);
		writeToFile(filePath, content);
		treeDataProvider.refresh();
	});
	context.subscriptions.push(disposableSDAction);

	let panel;
	let webview = vscode.commands.registerCommand('codeflowdiag.runIt', () => {
		vscode.commands.executeCommand('setContext', 'extensionActivated', true);
		panel = prepareWebView(context);
		const treeView = createTreeView(context);
		context.subscriptions.push(webview, treeView);
		panel.onDidDispose(() => {
			vscode.commands.executeCommand('setContext', 'extensionActivated', false);
		});
		// Listen for messages from the webview
		panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'listFiles':
					vscode.commands.executeCommand('codeflowdiag.listFiles', panel, message.nodeId);
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
		const uri = vscode.Uri.file(item.pt);
		vscode.workspace.fs.readFile(uri).then(fileContent => {
			const contentString = Buffer.from(fileContent).toString('utf-8');
			const fileName = vscode.workspace.asRelativePath(item.pt);
			panel.webview.postMessage({ command: 'loadDiag', data: contentString, fileName: fileName });
		}).catch(error => {
			console.error('Error loading file:', error);
		});
	})
	context.subscriptions.push(disposableOTVIAction);
}

async function openEditorWithRelativePath(relativePath, positionInDocument) {
	try {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found.');
			return;
		}

		const absolutePath = path.join(workspaceFolder.uri.fsPath, relativePath);

		// Convert the absolute path to a URI
		const uri = vscode.Uri.file(absolutePath);

		// Open the text document associated with the provided URI
		const document = await vscode.workspace.openTextDocument(uri);

		// Show the document in editor
		let lineNumber = parseInt(positionInDocument.substring(1));
		await vscode.window.showTextDocument(document,
			{ selection: new vscode.Range(lineNumber, 0, lineNumber, 0) });

	} catch (error) {
		// Handle any errors
		vscode.window.showErrorMessage('Failed to open document, error: ' + error);
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

	newPanel.iconPath = vscode.Uri.file(context.asAbsolutePath('./structure-diagram-icon.png'));

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

function deactivate() {
	console.log('deactivate');
	vscode.commands.executeCommand('setContext', 'extensionActivated', false);
}

module.exports = {
	activate,
	deactivate
}