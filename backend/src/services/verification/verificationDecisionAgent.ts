/**
 * Agent 3: Verification Decision Agent
 * 
 * Responsibility:
 * - Make binary verification decision based STRICTLY on evidence matches
 * - Provide confidence score
 * - Explain reasoning with evidence citations
 * 
 * This agent MUST NOT:
 * - Hallucinate or assume facts not in evidence
 * - Be lenient (INSUFFICIENT_EVIDENCE is valid answer)
 * - Make decisions without explicit reasoning
 * 
 * Allowed Outputs ONLY:
 * - VERIFIED: Evidence directly supports the claim
 * - CONTRADICTED: Evidence contradicts the claim
 * - INSUFFICIENT_EVIDENCE: Not enough evidence to decide
 * 
 * Example:
 * Input: {
 *   normalizedClaim: "Company is SOC 2 Type II certified",
 *   evidenceMatches: [{
 *     textSnippet: "Independent Auditor's Report...SOC 2 Type II",
 *     relevanceScore: 0.95
 *   }]
 * }
 * Output: {
 *   status: "VERIFIED",
 *   confidence: 0.9,
 *   reasoning: "Evidence match on page 1 contains explicit SOC 2 Type II audit report from recognized auditor."
 * }
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  VerificationDecisionInput,
  VerificationDecisionOutput,
  VerificationDecisionInputSchema,
  VerificationDecisionOutputSchema,
} from './interfaces';
import { logger } from '../../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class VerificationDecisionAgent {
  async decide(input: VerificationDecisionInput): Promise<VerificationDecisionOutput> {
    // Validate input
    const validatedInput = VerificationDecisionInputSchema.parse(input);
    
    logger.info('[VerificationDecisionAgent] Making decision:', {
      matchesCount: validatedInput.evidenceMatches.length,
    });
    
    if (validatedInput.evidenceMatches.length === 0) {
      // No evidence = automatic INSUFFICIENT_EVIDENCE
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        confidence: 1.0,
        reasoning: 'No evidence matches found. Cannot verify claim without supporting evidence.',
      };
    }
    
    // Build evidence summary
    const evidenceSummary = validatedInput.evidenceMatches
      .map((match, idx) => {
        const pageInfo = match.page ? ` (Page ${match.page})` : '';
        return `Match ${idx + 1}${pageInfo} [Relevance: ${match.relevanceScore}]:\n"${match.textSnippet}"`;
      })
      .join('\n\n');
    
    const prompt = `You are a verification auditor. Your job is to decide if a claim is verified based STRICTLY on the evidence provided.

CLAIM TO VERIFY:
"${validatedInput.normalizedClaim}"

EVIDENCE FOUND:
${evidenceSummary}

Your task:
Make ONE of these decisions:
1. VERIFIED - Evidence directly and explicitly supports the claim
2. CONTRADICTED - Evidence contradicts or refutes the claim
3. INSUFFICIENT_EVIDENCE - Not enough evidence to verify (when in doubt, choose this)

Rules for verification:
- VERIFIED requires explicit, direct evidence (not inference)
- High-relevance matches (>0.8) from authoritative sources support VERIFIED
- Missing key details = INSUFFICIENT_EVIDENCE
- Conflicting evidence = CONTRADICTED
- Confidence score: higher for clearer evidence

Output ONLY valid JSON:
{
  "status": "VERIFIED|CONTRADICTED|INSUFFICIENT_EVIDENCE",
  "confidence": 0.85,
  "reasoning": "Explicit explanation citing specific evidence matches"
}

IMPORTANT:
- reasoning must cite specific evidence (e.g., "Match 1 on Page 3 shows...")
- confidence must reflect evidence quality (weak evidence = lower confidence)
- When uncertain, use INSUFFICIENT_EVIDENCE with explanation`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
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
      const validatedOutput = VerificationDecisionOutputSchema.parse(output);
      
      logger.info('[VerificationDecisionAgent] Decision made:', {
        status: validatedOutput.status,
        confidence: validatedOutput.confidence,
      });
      
      return validatedOutput;
    } catch (error: any) {
      logger.error('[VerificationDecisionAgent] Decision failed:', error);
      throw new Error(`Verification decision failed: ${error.message}`);
    }
  }
}

export const verificationDecisionAgent = new VerificationDecisionAgent();
