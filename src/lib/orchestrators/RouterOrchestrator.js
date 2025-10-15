// Orchestrator: single-prompt agent selection → agent respond

import { geminiGenerate } from '../gemini.js';
import { InstigativeFriendAgent } from '../agents/InstigativeFriendAgent.js';
import { LightheartedFriendAgent } from '../agents/LightheartedFriendAgent.js';
import { PragmaticFriendAgent } from '../agents/PragmaticFriendAgent.js';


const SELECTION_SCHEMA = {  
  type: 'OBJECT',
  properties: {
    agent: { type: 'STRING' },
    reasons: { type: 'STRING' }
  },
  required: ['agent']
};

export class Orchestrator {
  constructor() {
    this.name = 'instigative_lighthearted_pragmatic';
    this.agentByName = {
      instigative: new InstigativeFriendAgent(),
      lighthearted: new LightheartedFriendAgent(),
      pragmatic: new PragmaticFriendAgent()
    };
  }

  async _respondWith(agentName, contents) { 
    console.log("inside respond with of router")

    const agent = this.agentByName[agentName] || this.agentByName.lighthearted;
    const res = await agent.respond(contents);
    return res?.text || '';
  }

  async orchestrate(contents) {
    console.log("inside orchestrate of router")

    const orchestratorPrompt = `Your job is to choose which emotional agents should respond to the user right now.
        Think in two steps:
        1) What emotions would best connect with the user right now, and what do they need (e.g., reassurance, validation, encouragement, caution)? Prioritize the latest user message while considering prior user messages with light recency weighting.
        2) Pick the agent whose voice best matches that need.

        Available agents: "instigative", "lighthearted", "pragmatic". ONLY USE ONE OF THESE AGENTS.

        Constraints:
        - Speak only through structured output. No extra text.
        - Choose agents only from the list above.
        - Prefer clarity and coherence over breadth.

        Output strictly as JSON:
        {
          "agent": "lighthearted",
          "reasons": "User wants to have a fun time"
        }`;

    const result = await geminiGenerate({
      contents,
      systemPrompt: orchestratorPrompt,
      config: { responseMimeType: 'application/json', responseSchema: SELECTION_SCHEMA }
    });

    let agent = 'lighthearted';
    let reasons = 'Defaulted to lighthearted';
    
    try {
      const parsed = JSON.parse(result.text || '{}');
      agent = parsed?.agent;

      console.log('agent selected')
      console.log(agent)
      if (parsed?.reasons) reasons = String(parsed.reasons);
    } catch (_) {}

    const text = await this._respondWith(agent, contents);

    const frameSet = { frames: { persona: { value: agent, rationale: [reasons] } } };
    return { assistantMessage: text.message || '', frameSet, agent, reasons };
  }
}