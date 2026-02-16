import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('CodeForgeX is now active!');

	const disposable = vscode.commands.registerCommand('codeforgex.startPractice', async () => {

		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active file detected.');
			return;
		}

		const fileName = editor.document.fileName;
		const languageId = editor.document.languageId;
		const baseName = fileName.split('/').pop()?.toLowerCase() || '';

		let detectedTopic = 'General Programming';

		if (baseName.includes('binary') || baseName.includes('search')) {
			detectedTopic = 'Searching';
		} else if (baseName.includes('sort')) {
			detectedTopic = 'Sorting';
		} else if (baseName.includes('linked') || baseName.includes('list')) {
			detectedTopic = 'Linked List';
		}

		// Step 1: Show detected topic clearly
		const decision = await vscode.window.showInformationMessage(
			`Detected Topic: ${detectedTopic}`,
			{ modal: true },
			'Continue',
			'Change Topic'
		);

		if (!decision) {
			return;
		}

		// Step 2: If user wants to change topic
		if (decision === 'Change Topic') {
			const manualTopic = await vscode.window.showInputBox({
				prompt: 'Enter topic name manually'
			});

			if (manualTopic && manualTopic.trim() !== '') {
				detectedTopic = manualTopic.trim();
			}
		}

		// Final confirmation message
		vscode.window.showInformationMessage(
			`Language: ${languageId} | Topic: ${detectedTopic}`
		);

	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
