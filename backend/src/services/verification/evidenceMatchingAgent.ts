/**
 * Agent 2: Evidence Matching Agent
 * 
 * Responsibility:
 * - Match claim requirements against available evidence
 * - Extract ONLY relevant text spans with citations
 * - Assign relevance scores
 * 
 * This agent MUST NOT:
 * - Invent evidence
 * - Summarize or paraphrase (preserve exact text)
 * - Make verification decisions
 * - Return evidence without page numbers (for PDFs)
 * 
 * Example:
 * Input: {
 *   normalizedClaim: "Company is SOC 2 Type II certified",
 *   verificationRequirements: ["SOC 2 Type II audit report"],
 *   availableEvidence: [{ source: "pdf", content: "...SOC 2 Type II Report..." }]
 * }
 * Output: {
 *   matches: [{
 *     source: "pdf",
 *     page: 1,
 *     textSnippet: "Independent Service Auditor's Report on Controls...SOC 2 Type II",
 *     relevanceScore: 0.95
 *   }]
 * }
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  EvidenceMatchingInput,
  EvidenceMatchingOutput,
  EvidenceMatchingInputSchema,
  EvidenceMatchingOutputSchema,
} from './interfaces';
import { logger } from '../../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class EvidenceMatchingAgent {
  async matchEvidence(input: EvidenceMatchingInput): Promise<EvidenceMatchingOutput> {
    // Validate input
    const validatedInput = EvidenceMatchingInputSchema.parse(input);
    
    logger.info('[EvidenceMatchingAgent] Matching evidence:', {
      requirementsCount: validatedInput.verificationRequirements.length,
      evidenceCount: validatedInput.availableEvidence.length,
    });
    
    if (validatedInput.availableEvidence.length === 0) {
      // No evidence available
      return { matches: [] };
    }
    
    // Build evidence context
    let evidenceContext = '';
    validatedInput.availableEvidence.forEach((evidence, idx) => {
      evidenceContext += `\nEVIDENCE ${idx + 1} (${evidence.source}):\n`;
      
      if (evidence.pageContent) {
        // PDF with page-by-page content
        Object.entries(evidence.pageContent).forEach(([pageNum, pageText]) => {
          evidenceContext += `[Page ${pageNum}]\n${pageText.substring(0, 2000)}\n`;
        });
      } else {
        // Webpage or full text
        evidenceContext += `${evidence.content.substring(0, 5000)}\n`;
      }
    });
    
    const prompt = `You are an evidence analyst. Your task is to find text spans in the provided evidence that match the verification requirements for a claim.

CLAIM:
"${validatedInput.normalizedClaim}"

VERIFICATION REQUIREMENTS:
${validatedInput.verificationRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

AVAILABLE EVIDENCE:
${evidenceContext}

Your task:
1. Find EXACT text spans from the evidence that match the requirements
2. Extract the text span verbatim (no summarization)
3. Note the page number if from PDF
4. Assign relevance score (0.0-1.0)

CRITICAL RULES:
- Extract text EXACTLY as written (copy-paste, do not paraphrase)
- Only return text that actually exists in the evidence
- If evidence is from PDF, you MUST include page number
- Relevance score: 1.0 = perfect match, 0.5 = partial match, 0.0 = no match
- Limit text snippets to 500 characters max

Output ONLY valid JSON:
{
  "matches": [
    {
      "source": "pdf|webpage",
      "evidenceId": "optional-id",
      "page": 1,
      "textSnippet": "exact text from evidence",
      "relevanceScore": 0.95
    }
  ]
}

If no relevant evidence found, return: {"matches": []}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });
      
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Expected text response from Claude');
      }
      
      // Extract JSON
      let jsonStr = content.text.trim();
      const jsonMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const output = JSON.parse(jsonStr);
      
      // Validate output
      const validatedOutput = EvidenceMatchingOutputSchema.parse(output);
      
      logger.info('[EvidenceMatchingAgent] Matching complete:', {
        matchesFound: validatedOutput.matches.length,
      });
      
      return validatedOutput;
    } catch (error: any) {
      logger.error('[EvidenceMatchingAgent] Matching failed:', error);
      throw new Error(`Evidence matching failed: ${error.message}`);
    }
  }
}

export const evidenceMatchingAgent = new EvidenceMatchingAgent();
