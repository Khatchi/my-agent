import { tool } from "ai";
// import { file } from "bun";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { writeFileSync } from "fs";
import { join } from "path";

const fileChange = z.object({
    rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

// Tool to create a commit message
const commitMessageInput = z.object({
    rootDir: z.string().min(1).describe("The root directory"),
    commitMessage: z.string().min(1).describe("The commit message to use"),
});

type CommitMessageInput = z.infer<typeof commitMessageInput>;

// Tool to generate markdown file
const markdownFileInput = z.object({
    filePath: z.string().min(1).describe("The file path where to save the markdown file"),
    content: z.string().min(1).describe("The markdown content to write"),
});

type MarkdownFileInput = z.infer<typeof markdownFileInput>;


const excludeFiles = ["dist", "bun.lcok"]

// Function to  get file changes in a directory
async function getFileChangesInDirectory({ rootDir }: FileChange) {
    const git = simpleGit(rootDir);
    const summary = await git.diffSummary();
    const diffs: { file: string; diff: string }[] = [];

    for (const file of summary.files) {
        if (excludeFiles.includes(file.file)) continue;
        const diff = await git.diff(["--", file.file]);
        diffs.push({ file: file.file, diff });
    }

    return diffs;
}


//function to create a commit message
async function generateCommitMessage({ rootDir, commitMessage }: CommitMessageInput) {
    const git = simpleGit(rootDir);
    
    try {
        // Add all changes
        await git.add('.');
        
        // Commit with the provided message
        const result = await git.commit(commitMessage);
        
        return {
            success: true,
            commitHash: result.commit,
            message: `Successfully committed with message: "${commitMessage}"`,
            summary: result.summary
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
            message: "Failed to create commit"
        };
    }
}

// Function to generate markdown file
async function generateMarkdownFile({ filePath, content }: MarkdownFileInput) {
    try {
        // Ensure the file has .md extension
        const finalPath = filePath.endsWith('.md') ? filePath : `${filePath}.md`;
        
        // Write the markdown content to file
        writeFileSync(finalPath, content, 'utf8');
        
        return {
            success: true,
            filePath: finalPath,
            message: `Successfully created markdown file at: ${finalPath}`,
            contentLength: content.length
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
            message: "Failed to create markdown file"
        };
    }
}

// Export the get file changes in directory tool
export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

// Export the commit message tool
export const generateCommitMessageTool = tool({
  description: "Creates a git commit with the provided commit message after adding all changes",
  inputSchema: commitMessageInput,
  execute: generateCommitMessage,
});

// Export the markdown file tool
export const generateMarkdownFileTool = tool({
  description: "Generates a markdown file with the provided content at the specified file path",
  inputSchema: markdownFileInput,
  execute: generateMarkdownFile,
});
