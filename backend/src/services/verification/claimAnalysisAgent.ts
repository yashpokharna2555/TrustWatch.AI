/**
 * Agent 1: Claim Analysis Agent
 * 
 * Responsibility:
 * - Normalize raw claim text
 * - Identify what evidence is needed to verify this claim
 * - Extract explicit verification requirements
 * 
 * This agent DOES NOT:
 * - Search for evidence
 * - Make verification decisions
 * - Invent requirements not implied by the claim
 * 
 * Example:
 * Input: "We are SOC 2 Type II certified"
 * Output: {
 *   claimType: "compliance",
 *   verificationRequirements: [
 *     "SOC 2 Type II audit report",
 *     "Report must be from recognized auditor",
 *     "Report must be recent (within 12 months)"
 *   ],
 *   normalizedClaim: "Company maintains SOC 2 Type II certification"
 * }
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ClaimAnalysisInput,
  ClaimAnalysisOutput,
  ClaimAnalysisInputSchema,
  ClaimAnalysisOutputSchema,
} from './interfaces';
import { logger } from '../../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class ClaimAnalysisAgent {
  async analyze(input: ClaimAnalysisInput): Promise<ClaimAnalysisOutput> {
    // Validate input
    const validatedInput = ClaimAnalysisInputSchema.parse(input);
    
    logger.info('[ClaimAnalysisAgent] Analyzing claim:', {
      claimType: validatedInput.claimType,
      textLength: validatedInput.rawClaimText.length,
    });
    
    const prompt = `You are a compliance analyst. Analyze this security/compliance claim and determine what evidence would be required to verify it.

Claim Text:
"${validatedInput.rawClaimText}"

Claim Type: ${validatedInput.claimType}
Source URL: ${validatedInput.sourceUrl}

Your task:
1. Normalize the claim into a clear, unambiguous statement
2. List specific evidence requirements needed to verify this claim
3. Be strict: only list requirements that are directly implied by the claim

Output ONLY valid JSON in this exact format:
{
  "claimType": "compliance|privacy|sla|security",
  "verificationRequirements": [
    "Specific requirement 1",
    "Specific requirement 2"
  ],
  "normalizedClaim": "Clear normalized statement"
}

Rules:
- verificationRequirements must be actionable and specific
- normalizedClaim must be a single clear sentence
- Do not invent requirements not implied by the original claim
- For certifications (SOC2, ISO), require recent audit reports
- For privacy claims, require policy documentation
- For SLA claims, require numeric evidence`;

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
      
      // Extract JSON from response (Claude sometimes wraps it in markdown)
      let jsonStr = content.text.trim();
      const jsonMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const output = JSON.parse(jsonStr);
      
      // Validate output schema
      const validatedOutput = ClaimAnalysisOutputSchema.parse(output);
      
      logger.info('[ClaimAnalysisAgent] Analysis complete:', {
        requirementsCount: validatedOutput.verificationRequirements.length,
      });
      
      return validatedOutput;
    } catch (error: any) {
      logger.error('[ClaimAnalysisAgent] Analysis failed:', error);
      throw new Error(`Claim analysis failed: ${error.message}`);
    }
  }
}

export const claimAnalysisAgent = new ClaimAnalysisAgent();
