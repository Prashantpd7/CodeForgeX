import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import OpenAI from "openai";


dotenv.config({
	path: path.resolve(__dirname, '../.env')
});
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

import { generatePracticeQuestion } from './services/aiService';

let storedHint: string | null = null;
let storedSolution: string | null = null;
let storedExplanation: string | null = null;

// State flags for context management
let hasQuestionFlag = false;
let hasSolutionFlag = false;
let hasExplanationFlag = false;
let hintRevealedFlag = false;

export function activate(context: vscode.ExtensionContext) {
	// Initialize context keys
	vscode.commands.executeCommand('setContext', 'codeforgex.hasQuestion', false);
	vscode.commands.executeCommand('setContext', 'codeforgex.hasSolution', false);
	vscode.commands.executeCommand('setContext', 'codeforgex.hasExplanation', false);
	vscode.commands.executeCommand('setContext', 'codeforgex.hintRevealed', false);
	console.log('CodeForgeX is now active!');

	// Helper function to update context flag and variable
	async function updateContextFlag(contextKey: string, value: boolean) {
		await vscode.commands.executeCommand('setContext', contextKey, value);
		if (contextKey === 'codeforgex.hasQuestion') hasQuestionFlag = value;
		if (contextKey === 'codeforgex.hasSolution') hasSolutionFlag = value;
		if (contextKey === 'codeforgex.hasExplanation') hasExplanationFlag = value;
		if (contextKey === 'codeforgex.hintRevealed') hintRevealedFlag = value;
	}

	// Build available actions based on current state
	function buildAvailableActions(): string[] {
		const actions: string[] = [];
		
		if (hasQuestionFlag && !hintRevealedFlag) {
			actions.push('Show Hint');
		}
		if (hasQuestionFlag && !hasSolutionFlag) {
			actions.push('Show Solution');
		}
		if (hasSolutionFlag && !hasExplanationFlag) {
			actions.push('Explain Code');
		}
		if (hasSolutionFlag) {
			actions.push('Evaluate Code');
		}
		if (hasExplanationFlag) {
			actions.push('Remove Explanation');
		}
		
		return actions;
	}

	function detectQuestionInFile(editor: vscode.TextEditor): boolean {
		const content = editor.document.getText();
		return content.includes('Question (');
	}

	const disposable = vscode.commands.registerCommand(
		'codeforgex.startPractice',
		async () => {

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active file detected.');
				return;
			}

			const hasQuestion = detectQuestionInFile(editor);

			// ================================
			// GENERATE QUESTION
			// ================================
			if (!hasQuestion) {
				// Reset context keys for new question
			await updateContextFlag('codeforgex.hintRevealed', false);
			await updateContextFlag('codeforgex.hasSolution', false);
			await updateContextFlag('codeforgex.hasExplanation', false);
				const fileName = editor.document.fileName;
				const baseName = fileName.split('/').pop()?.toLowerCase() || '';

				let detectedTopic = 'General Programming';

				if (baseName.includes('binary') || baseName.includes('search')) {
					detectedTopic = 'Searching';
				} else if (baseName.includes('sort')) {
					detectedTopic = 'Sorting';
				} else if (baseName.includes('linked') || baseName.includes('list')) {
					detectedTopic = 'Linked List';
				}

				const topicDecision = await vscode.window.showInformationMessage(
					`Detected Topic: ${detectedTopic}`,
					{ modal: true },
					'Continue',
					'Change Topic'
				);

				if (!topicDecision) return;

				if (topicDecision === 'Change Topic') {
					const manualTopic = await vscode.window.showInputBox({
						prompt: 'Enter topic name manually'
					});

					if (manualTopic && manualTopic.trim() !== '') {
						detectedTopic = manualTopic.trim();
					}
				}

				const difficulty = await vscode.window.showQuickPick(
					['Easy', 'Medium', 'Hard'],
					{ placeHolder: 'Select difficulty level' }
				);

				if (!difficulty) return;

				const languageId = editor.document.languageId;
				let aiContent: string;

try {
    aiContent = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Generating practice question...",
            cancellable: false
        },
        async () => {
            return await generatePracticeQuestion(
                detectedTopic,
                languageId,
                difficulty
            );
        }
    );
} catch {
    vscode.window.showErrorMessage('AI generation failed.');
    return;
}

				const commentPrefix = languageId === 'python' ? '# ' : '// ';
				const headerLine = `${commentPrefix}Question (${difficulty})\n\n`;

				const questionMatch = aiContent.match(/\[QUESTION\]([\s\S]*?)(?=\[HINT\]|\[SOLUTION\]|$)/);
				const hintMatch = aiContent.match(/\[HINT\]([\s\S]*?)(?=\[SOLUTION\]|$)/);
				const solutionMatch = aiContent.match(/\[SOLUTION\]([\s\S]*)/);

				storedHint = hintMatch ? hintMatch[1].trim() : null;
				storedSolution = solutionMatch ? solutionMatch[1].trim() : null;

				let finalContent = headerLine;

				if (questionMatch) {
					finalContent += questionMatch[1]
						.trim()
						.split('\n')
						.map(line => commentPrefix + line)
						.join('\n') + '\n\n';
				}

				await editor.edit(editBuilder => {
					editBuilder.insert(
						new vscode.Position(0, 0),
						finalContent
					);
				});

				await vscode.workspace.getConfiguration('editor').update(
					'wordWrap',
					'on',
					vscode.ConfigurationTarget.Workspace
				);

				// Set context key to show menu items
			await updateContextFlag('codeforgex.hasQuestion', true);
				return;
			}

			// ================================
			// IF QUESTION EXISTS → Show Tools
			// ================================
		const availableActions = buildAvailableActions();
		
		if (availableActions.length === 0) {
			vscode.window.showInformationMessage('No actions available.');
			return;
		}

		const action = await vscode.window.showQuickPick(
			availableActions,
			{ placeHolder: 'Select action' }
		);

		if (!action) return;

		if (action === 'Show Hint') {
			await vscode.commands.executeCommand('codeforgex.showHint');
		}

		if (action === 'Show Solution') {
			await vscode.commands.executeCommand('codeforgex.showSolution');
		}

		if (action === 'Explain Code') {
			await vscode.commands.executeCommand('codeforgex.explainCode');
		}

		if (action === 'Evaluate Code') {
			await vscode.commands.executeCommand('codeforgex.evaluateSolution');
		}

		if (action === 'Remove Explanation') {
			await vscode.commands.executeCommand('codeforgex.removeExplanation');
		}
	}
);

	const hintCommand = vscode.commands.registerCommand(
		'codeforgex.showHint',
		async () => {

			const editor = vscode.window.activeTextEditor;
			if (!editor || !storedHint) {
				vscode.window.showInformationMessage('No hint available.');
				return;
			}

			if (editor.document.getText().includes('Hint:')) {
				vscode.window.showInformationMessage('Hint already revealed.');
				return;
			}

			const commentPrefix = editor.document.languageId === 'python' ? '# ' : '// ';

			const hintContent =
				`\n${commentPrefix}Hint:\n` +
				storedHint
					.split('\n')
					.map(line => commentPrefix + line)
					.join('\n') +
				'\n\n';

			await editor.edit(editBuilder => {
				editBuilder.insert(
					new vscode.Position(editor.document.lineCount, 0),
					hintContent
				);
			});

		// Set context key to hide this menu item
		await updateContextFlag('codeforgex.hintRevealed', true);
	}
);

const solutionCommand = vscode.commands.registerCommand(
	'codeforgex.showSolution',
	async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor || !storedSolution) {
			vscode.window.showInformationMessage('No solution available.');
			return;
		}

		const currentText = editor.document.getText();

		if (currentText.includes(storedSolution)) {
			vscode.window.showInformationMessage('Solution already revealed.');
			return;
		}

		const solutionContent = `\n${storedSolution}\n\n`;

		await editor.edit(editBuilder => {
			editBuilder.insert(
				new vscode.Position(editor.document.lineCount, 0),
				solutionContent
			);
		});

		// Set context key to show explain and evaluate options
		await updateContextFlag('codeforgex.hasSolution', true);
	}
);

	const evaluateCommand = vscode.commands.registerCommand(
		'codeforgex.evaluateSolution',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active file.');
				return;
			}

			if (!storedSolution) {
				vscode.window.showErrorMessage('No solution available for evaluation.');
				return;
			}

			const userCode = editor.document.getText();
			const languageId = editor.document.languageId;
			const commentPrefix = languageId === 'python' ? '# ' : '// ';

			let evaluationResult: string;

			try {
				evaluationResult = await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: "Evaluating your code...",
						cancellable: false
					},
					async () => {
						const response = await openai.chat.completions.create({
							model: "gpt-4o-mini",
							messages: [
								{
									role: "user",
									content: `You are a code reviewer. Analyze this ${languageId} code and provide a SHORT evaluation.

REFERENCE SOLUTION:
${storedSolution}

USER'S CODE:
${userCode}

Respond EXACTLY in this format (no markdown, no decorators):

Code Evaluation Summary:

Correctness:
<2 sentences max about correctness. Use "Your code">

Edge Cases:
<2 sentences max, or "Handles edge cases well">

Time Complexity:
<2 sentences max, or "Complexity is appropriate">

Code Quality:
<2 sentences max, or "Code is clean and readable">

Final Verdict:
<Correct / Partially Correct / Needs Improvement>

IF YOUR CODE NEEDS IMPROVEMENTS, append this section ONLY IF NEEDED:

Suggestions:

LINE <number>:
Issue: <brief issue description>
Better Approach: <what to do instead>
Example Replacement: <1-2 lines of code>

Only suggest lines with clear improvements. Keep to 2-3 suggestions maximum.

IMPORTANT:
- Do NOT add markdown formatting.
- Do NOT wrap anything in backticks.
- Do NOT add decorative lines or borders.
- Speak directly: "Your code" not "the user's code".
- If no improvements needed, do NOT include Suggestions section.`
								}
							],
							temperature: 0.4
						});

						return response.choices[0].message.content || "Evaluation could not be generated.";
					}
				);

				// Parse evaluation response
				const summaryMatch = evaluationResult.match(/Code Evaluation Summary:([\s\S]*?)(?=Suggestions:|$)/);
				const suggestionsMatch = evaluationResult.match(/Suggestions:([\s\S]*?)$/);

				const summary = summaryMatch ? summaryMatch[1].trim() : evaluationResult;
				const suggestionsText = suggestionsMatch ? suggestionsMatch[1].trim() : '';

				// Check if evaluation already exists
				const currentFullText = editor.document.getText();
				if (currentFullText.includes('Code Evaluation Summary:')) {
					vscode.window.showWarningMessage('Evaluation already exists. Remove it before running again.');
					return;
				}

				// Insert summary at end of file
				const summaryBlock = 
					`\n\n${commentPrefix}==== Code Evaluation Summary ====\n` +
					summary
						.split('\n')
						.map(line => commentPrefix + (line.trim() ? line : ''))
						.join('\n') +
					`\n${commentPrefix}==================================\n`;

				await editor.edit(editBuilder => {
					editBuilder.insert(
						new vscode.Position(editor.document.lineCount, 0),
						summaryBlock
					);
				});

				// Parse and insert suggestions if they exist
				if (suggestionsText.length > 0) {
					const lineMatches = suggestionsText.matchAll(/LINE\s*(\d+):([\s\S]*?)(?=LINE\s*\d+:|$)/gi);
					const suggestions = Array.from(lineMatches).map(match => ({
						lineNumber: parseInt(match[1]),
						content: match[2].trim()
					}));

					// Sort by line number descending to avoid offset issues
					suggestions.sort((a, b) => b.lineNumber - a.lineNumber);

					const updatedText = editor.document.getText();
					const lines = updatedText.split('\n');

					for (const suggestion of suggestions) {
						const lineIndex = suggestion.lineNumber - 1;
						
						if (lineIndex >= 0 && lineIndex < lines.length) {
							// Check if suggestion already exists
							if (!lines[lineIndex - 1]?.includes('Suggestion:')) {
								const suggestionLines = suggestion.content
									.split('\n')
									.filter(line => line.trim().length > 0)
									.map(line => commentPrefix + line.trim())
									.join('\n');

								const insertionPos = new vscode.Position(lineIndex, 0);
								
								await editor.edit(editBuilder => {
									editBuilder.insert(insertionPos, suggestionLines + '\n');
								});
							}
						}
					}
				}

				vscode.window.showInformationMessage('Code evaluation complete. Review suggestions in file.');

			} catch (error) {
				vscode.window.showErrorMessage('Code evaluation failed. Please try again.');
				console.error('Evaluation error:', error);
			}
		}
	);
	const explainCommand = vscode.commands.registerCommand(
    'codeforgex.explainCode',
    async () => {
		console.log("Explain Code clicked");
vscode.window.showInformationMessage("Explain command triggered");

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active file.');
            return;
        }

        const fullText = editor.document.getText();

        if (!storedSolution || !fullText.includes(storedSolution)) {
            vscode.window.showInformationMessage('Generate solution first.');
            return;
        }

        try {

    const explainedCode = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Explaining code...",
            cancellable: false
        },
        async () => {

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: `
Explain the following ${editor.document.languageId} code.

Rules:
- Add ONE short comment line before each line of code.
- Do NOT remove original code.
- Do NOT add markdown formatting.
- Do NOT wrap in triple backticks.
- Return ONLY code with explanation comments.

Code:
${storedSolution}
`
                    }
                ],
                temperature: 0.3
            });

            return response.choices[0].message.content || "";
        }
    );

    const currentText = editor.document.getText();

    // Replace only solution block
    const updatedText = currentText.replace(
        storedSolution!,
        explainedCode.trim()
    );

    await editor.edit(editBuilder => {
        const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(currentText.length)
        );
        editBuilder.replace(fullRange, updatedText);
    });

    // Store explanation and update context flag
    storedExplanation = explainedCode.trim();
    await updateContextFlag('codeforgex.hasExplanation', true);

	} catch (error) {
		vscode.window.showErrorMessage('Explanation failed.');
	}
	}
);

const removeExplanationCommand = vscode.commands.registerCommand(
	'codeforgex.removeExplanation',
	async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !storedExplanation) {
			vscode.window.showInformationMessage('No explanation to remove.');
			return;
		}

		const currentText = editor.document.getText();

		// Revert to stored solution
		if (storedSolution && currentText.includes(storedExplanation)) {
			const revertedText = currentText.replace(
				storedExplanation,
				storedSolution
			);

			await editor.edit(editBuilder => {
				const fullRange = new vscode.Range(
					editor.document.positionAt(0),
					editor.document.positionAt(currentText.length)
				);
				editBuilder.replace(fullRange, revertedText);
			});

			// Clear explanation and update context flag
			storedExplanation = null;
			await updateContextFlag('codeforgex.hasExplanation', false);
		}
	}
);

	context.subscriptions.push(
		disposable,
		hintCommand,
		solutionCommand,
		evaluateCommand,
		explainCommand,
		removeExplanationCommand
	);
}

export function deactivate() {}
