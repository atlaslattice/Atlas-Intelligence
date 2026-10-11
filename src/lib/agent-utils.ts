import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firestore-utils';

export interface AgentData {
  userId: string;
  houseId: string;
  provider: string;
  system_prompt: string;
  status: 'ready' | 'running' | 'halted' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export const createAgent = async (userId: string, houseId: string, provider: string = 'gemini', system_prompt: string = '') => {
    const path = `users/${userId}/agents`;
    try {
        const agentRef = doc(collection(db, path));
        const newAgent: AgentData = {
          userId,
          houseId,
          provider,
          system_prompt,
          status: 'ready',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(agentRef, newAgent);
        return agentRef.id;
    } catch(error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
}

export const spawnHouseAgents = async (userId: string) => {
    const houses = ['H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07', 'H08', 'H09', 'H10', 'H11', 'H12'];
    
    // Caveat D mitigation: Deduplication Check
    const existingAgents = await getAgents(userId);
    const existingHouseIds = existingAgents ? existingAgents.map(a => a.houseId) : [];

    const agentIds = [];
    for (const house of houses) {
        if (!existingHouseIds.includes(house)) {
            agentIds.push(await createAgent(userId, house, 'gemini', `You are the specialized Autonomous Research Agent for House ${house}. Analyze domains and report.`));
        }
    }
    return agentIds;
}

export const getAgents = async (userId: string) => {
    const path = `users/${userId}/agents`;
    try {
        const querySnapshot = await getDocs(collection(db, path));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as AgentData }));
    } catch(error) {
        handleFirestoreError(error, OperationType.GET, path);
    }
}
