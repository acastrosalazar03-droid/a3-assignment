// Orchestrator: single-prompt agent selection → agent respond

import { geminiGenerate } from '../gemini.js';
import { InstigativeFriendAgent } from '../agents/InstigativeFriendAgent.js';
import { LightheartedFriendAgent } from '../agents/LightheartedFriendAgent.js';
import { PragmaticFriendAgent } from '../agents/PragmaticFriendAgent.js';

export class Orchestrator {
  constructor() {
    this.name = 'instigative_lighthearted_pragmatic';
    this.instigative = new InstigativeFriendAgent()
    this.lighthearted = new LightheartedFriendAgent()
    this.pragmatic = new PragmaticFriendAgent()
  }

  async agent_responses(contents) { 
    console.log("inside respond with of aggregator")

    const resOne = await this.instigative.respond(contents);
    const resTwo = await this.lighthearted.respond(contents);
    const resThree = await this.pragmatic.respond(contents);

    return { instigative: resOne, lighthearted: resTwo, pragmatic: resThree };
  }

  async orchestrate(contents) {
    console.log("inside orchestrate of aggregator")

    const agentInputs = await this.agent_responses(contents);

    const aggregationPrompt = `Conversation intro
        Combine the inputs

        Inputs: "instigative", "lighthearted", "pragmatic". 

        Use these instructions to guide your aggregation:
        - Speak only through structured output. No extra text.
        - Choose agents only from the list above.
        - Prefer clarity and coherence over breadth.
        - Respond with a single attribute called 'combination' that contains the full combined response.
        - This 'combination' value should be the aggregated, smooth combination of all three agents' inputs.
        - Balance tone of all agents 
        - Make sure to distribute your response on each agent's input to create a holistic response

        Responses from agents:
        1) instigative: ${agentInputs.instigative.text || ''}
        2) lighthearted: ${agentInputs.lighthearted.text || ''}
        3) pragmatic: ${agentInputs.pragmatic.text || ''}
        `;

    const result = await geminiGenerate({
      contents,
      systemPrompt: aggregationPrompt,
      config: { responseMimeType: 'application/json' }
    });


    let finalMsg;

    const parsed = JSON.parse(result?.text || '{}');
    if (parsed?.combination) finalMsg = String(parsed.combination);
    else finalMsg = "Sorry, I'm having trouble combining my friends' perspectives right now."

    return { 
      assistantMessage: finalMsg,
      frameSet: {
        frames: {
          persona: {
            value: 'aggregator',
            rationale: ['All agents are being aggregated, handled by Gemini']
          }
        }
      },
      agent: 'aggregator',
      reasons: 'Combined each friend perspective' 
    };
  }
}