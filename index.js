console.log("Running Documentation Generator...");
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const IGNORE_CONFIG_FILE = ".ignoreconfig";
let ignorePatterns = [];

if (fs.existsSync(IGNORE_CONFIG_FILE)) {
    ignorePatterns = fs.readFileSync(IGNORE_CONFIG_FILE, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));
}

function shouldIgnore(filePath) {
    return ignorePatterns.some(pattern => filePath.includes(pattern));
}

function processFilesRecursively(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Error reading directory ${dir}:`, err);
            return;
        }
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (shouldIgnore(filePath)) return;
            fs.stat(filePath, async (err, stats) => {
                if (err) {
                    console.error(`Error reading file stats for ${filePath}:`, err);
                    return;
                }
                if (stats.isDirectory()) {
                    processFilesRecursively(filePath);
                } else if (file.endsWith(".js") || file.endsWith(".ts")) {
                    await addDocumentation(filePath);
                }
            });
        });
})}

async function addDocumentation(filePath) {
    try {
        let fileContent = fs.readFileSync(filePath, "utf-8");
        const prompt = `Write clear, professional comments for the following code:\n\n${fileContent}`;
        const result = await model.generateContent(prompt);
        const aiGeneratedDocs = result.response.text();

        // Split AI-generated documentation into lines
        let docLines = aiGeneratedDocs.split("\n");

        // Remove the first line and the last two lines
        if (docLines.length > 2) {
            docLines = docLines.slice(1, docLines.length - 2);
        } else {
            console.warn("AI documentation is too short to remove the first and last lines.");
        }

        // Join the modified documentation back into a single string
        const updatedContent = docLines.join("\n");

        // Write the updated content (AI response) to the file
        fs.writeFileSync(filePath, updatedContent, "utf-8");
        console.log(`✅ Documentation added to: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
    }
}


processFilesRecursively(process.cwd());