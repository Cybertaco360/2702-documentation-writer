/**
 * @file Documentation Generator Script
 * This script automates the process of generating and adding documentation to JavaScript and TypeScript files
 * using the Google Gemini AI model.  It recursively traverses a directory, reads files, generates comments,
 * and writes the updated content back to the files.
 */

console.log("Running Documentation Generator...");

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config"; // Load environment variables from .env file
import fs from "fs";
import path from "path";

/**
 * Initializes the Google Generative AI client with the API key from the environment variables.
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Retrieves the Gemini generative model for generating documentation.  Currently configured to use "gemini-2.0-flash".
 */
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * @constant {string} IGNORE_CONFIG_FILE - The name of the file containing patterns to ignore during processing.
 */
const IGNORE_CONFIG_FILE = ".ignoreconfig";

/**
 * @type {string[]} ignorePatterns - An array of file path patterns to ignore. Loaded from the IGNORE_CONFIG_FILE.
 */
let ignorePatterns = [];

/**
 * Reads the ignore configuration file, if it exists, and populates the `ignorePatterns` array.
 */
if (fs.existsSync(IGNORE_CONFIG_FILE)) {
    ignorePatterns = fs.readFileSync(IGNORE_CONFIG_FILE, "utf-8")
        .split("\n")
        .map(line => line.trim()) // Remove leading/trailing whitespace
        .filter(line => line && !line.startsWith("#")); // Remove empty lines and comments
}

/**
 * Checks if a file path should be ignored based on the `ignorePatterns`.
 *
 * @param {string} filePath - The path to the file to check.
 * @returns {boolean} - True if the file should be ignored, false otherwise.
 */
function shouldIgnore(filePath) {
    return ignorePatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Recursively processes files within a directory.  For each file, it checks if it's a directory or a JavaScript/TypeScript file
 * and then either recursively calls itself for subdirectories or calls `addDocumentation` to generate and add documentation.
 *
 * @param {string} dir - The directory to process.
 */
function processFilesRecursively(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Error reading directory ${dir}:`, err);
            return;
        }
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (shouldIgnore(filePath)) return; // Skip ignored files
            fs.stat(filePath, async (err, stats) => {
                if (err) {
                    console.error(`Error reading file stats for ${filePath}:`, err);
                    return;
                }
                if (stats.isDirectory()) {
                    processFilesRecursively(filePath); // Recursively process subdirectories
                } else if (file.endsWith(".js") || file.endsWith(".ts")) {
                    await addDocumentation(filePath); // Add documentation to JavaScript/TypeScript files
                }
            });
        });
    });
}

/**
 * Adds documentation to a single JavaScript or TypeScript file using the Google Gemini AI model.
 *
 * @async
 * @param {string} filePath - The path to the file to process.
 */
async function addDocumentation(filePath) {
    try {
        let fileContent = fs.readFileSync(filePath, "utf-8");
        const prompt = `Write clear, professional comments for the following code:\n\n${fileContent}`;
        const result = await model.generateContent(prompt);
        const aiGeneratedDocs = result.response.text();
        const updatedContent = `/*\n${aiGeneratedDocs}\n*/\n\n${fileContent}`; // Wrap AI-generated docs in block comments
        fs.writeFileSync(filePath, updatedContent, "utf-8");
        console.log(`✅ Documentation added to: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
    }
}

/**
 * Starts the documentation generation process from the current working directory.
 */
processFilesRecursively(process.cwd());