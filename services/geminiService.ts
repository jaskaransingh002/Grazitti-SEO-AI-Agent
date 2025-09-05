import { GoogleGenAI } from "@google/genai";
import type { UrlAuditReport, SeoCheckResult, ChatMessage } from '../types.js';
import { SeoCheckStatus } from '../types.js';

// Per coding guidelines, the API key MUST be obtained from process.env.API_KEY.
// It is assumed to be pre-configured and available in the execution environment.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// The library will throw an error if the API_KEY is missing, which is the desired behavior
// for a non-functional environment configuration.
const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getAiChatResponse = async (report: UrlAuditReport, messages: ChatMessage[]): Promise<string> => {
    const failedChecks = report.seoChecks
        .filter(check => check.status !== SeoCheckStatus.Pass)
        .map(check => `- ${check.checkName}: ${check.status} (${check.message})`)
        .join('\n');

    const conversationHistory = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    const prompt = `
        You are an expert SEO consultant chatbot. You are having a conversation with a user about their website.
        Your persona is helpful, concise, and expert.
        
        **CONTEXT OF THE AUDIT**
        - URL: ${report.url}
        - SEO Score: ${report.seoScore}/100
        - Generative Engine Optimization (GEO) Score: ${report.geoScore}/100 (evaluates readiness for AI Overviews and LLMs)
        - Audit Issues Found:
        ${failedChecks || "No issues found."}

        **CONVERSATION HISTORY**
        ${conversationHistory}
        
        **YOUR TASK**
        Based on the audit context and the conversation history, provide a helpful and relevant response to the user's last message.
        - If you provide suggestions (like new meta titles), format them as a Markdown list.
        - Keep your responses conversational and directly answer the user's request.
        - Do not repeat the context in your response. Just provide the answer.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error('Error fetching AI chat response:', error);
        return 'An error occurred while getting a response. Please try again.';
    }
};

export const getAiSiteSummary = async (reports: UrlAuditReport[], avgSeoScore: number, avgGeoScore: number): Promise<string> => {
    const domain = reports.length > 0 ? new URL(reports[0].url).hostname : 'the website';

    const issueCounts = reports.flatMap(report => report.seoChecks)
        .filter(check => check.status !== SeoCheckStatus.Pass)
        .reduce((acc, check) => {
            acc[check.checkName] = (acc[check.checkName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const sortedIssues = Object.entries(issueCounts)
        .sort(([, countA], [, countB]) => countB - countA);

    if (sortedIssues.length === 0) {
        return Promise.resolve("Excellent SEO health across all analyzed pages! No common issues were found. Continue maintaining these high standards.");
    }

    const issueSummary = sortedIssues
        .map(([checkName, count]) => `- **${checkName}:** Found on ${count} out of ${reports.length} pages.`)
        .join('\n');

    const prompt = `
        You are a senior SEO strategist analyzing a website audit. I have crawled ${reports.length} pages on ${domain}.
        The average SEO score is ${avgSeoScore.toFixed(0)}/100.
        The average Generative Engine Optimization (GEO) score for AI Overviews is ${avgGeoScore.toFixed(0)}/100.

        Here is a summary of the most frequent issues found:
        ${issueSummary}

        Based on this high-level data, provide a strategic summary with 3-4 key priorities for the entire website. 
        Focus on the most impactful changes that will improve the site's overall SEO health, rankings, and readiness for AI-driven search.
        Start with a brief, encouraging overview that mentions the scores, then present the priorities as a Markdown list.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text;
    } catch (error) {
        console.error('Error fetching AI site summary:', error);
        return 'An error occurred while fetching the AI site summary. Please check the console for details.';
    }
};