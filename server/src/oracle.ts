import { ethers } from 'ethers';
import { NETWORK, CONTRACTS, ORACLE, SCORING } from './config';
import { scanWalletActivity, WalletActivity } from './scanner';


const CREDIT_REGISTRY_ABI = [
  'function updateScore(address user, uint64 plaintextScore) external',
  'function hasScore(address user) external view returns (bool)',
  'function oracle() external view returns (address)'
];



export class CreditOracle {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private creditRegistry: ethers.Contract;

  constructor() {

    this.provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);    

    this.wallet = new ethers.Wallet(ORACLE.privateKey, this.provider);
    
    this.creditRegistry = new ethers.Contract(
      CONTRACTS.creditRegistry,
      CREDIT_REGISTRY_ABI,
      this.wallet 
    );

    console.log('🤖 Credit Oracle initialized');
    console.log(`📍 Oracle address: ${this.wallet.address}`);
    console.log(`📋 Credit Registry: ${CONTRACTS.creditRegistry}`);
  }


  async updateCreditScore(userAddress: string): Promise<{
    score: number;
    txHash: string;
  }> {
    try {
      console.log(`\n🔍 Processing credit score for ${userAddress}`);

      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      const activity = await scanWalletActivity(userAddress);

      const score = this.calculateCreditScore(activity);

      console.log(`📊 Calculated score: ${score}/850`);

      const tx = await this.creditRegistry.updateScore(userAddress, score);
      
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);

      const receipt = await tx.wait();

      console.log(`✅ Score updated on-chain! Block: ${receipt.blockNumber}`);

      return {
        score,
        txHash: receipt.hash
      };

    } catch (error: any) {
      console.error('❌ Error updating credit score:', error.message);
      throw error;
    }
  }



  private calculateCreditScore(activity: WalletActivity): number {
    let score = SCORING.baseScore; 

    // Bonus 1: Has lending activity (+100)
    if (activity.hasLendingActivity) {
      score += SCORING.weights.hasLendingActivity;
      console.log(`  ✓ Has lending activity: +${SCORING.weights.hasLendingActivity}`);
    }

    // Bonus 2: Never been liquidated (+50)
    if (activity.neverLiquidated) {
      score += SCORING.weights.neverLiquidated;
      console.log(`  ✓ Never liquidated: +${SCORING.weights.neverLiquidated}`);
    }

    // Bonus 3: Account age > 6 months (+100)
    if (activity.accountAgeMonths >= SCORING.thresholds.accountAgeMonths) {
      score += SCORING.weights.accountAge;
      console.log(`  ✓ Account age ${activity.accountAgeMonths}mo: +${SCORING.weights.accountAge}`);
    }

    // Bonus 4: Uses multiple protocols (+50)
    if (activity.protocolCount >= SCORING.thresholds.minProtocols) {
      score += SCORING.weights.multiProtocol;
      console.log(`  ✓ Multi-protocol user: +${SCORING.weights.multiProtocol}`);
    }

    // Bonus 5: Perfect repayment history (+150)
    if (activity.repaymentHistory === 'perfect') {
      score += SCORING.weights.perfectRepayment;
      console.log(`  ✓ Perfect repayments: +${SCORING.weights.perfectRepayment}`);
    } else if (activity.repaymentHistory === 'good') {
      score += Math.floor(SCORING.weights.perfectRepayment * 0.7); 
      console.log(`  ✓ Good repayments: +${Math.floor(SCORING.weights.perfectRepayment * 0.7)}`);
    } else if (activity.repaymentHistory === 'average') {
      score += Math.floor(SCORING.weights.perfectRepayment * 0.4); 
      console.log(`  ✓ Average repayments: +${Math.floor(SCORING.weights.perfectRepayment * 0.4)}`);
    }

    score = Math.min(score, SCORING.maxScore);

    score = Math.max(score, SCORING.minScore);

    return score;
  }


  async hasScore(userAddress: string): Promise<boolean> {
    try {
      return await this.creditRegistry.hasScore(userAddress);
    } catch (error) {
      console.error('Error checking score existence:', error);
      return false;
    }
  }


  async getOracleBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }


  async verifyOracleAuthorization(): Promise<boolean> {
    try {
      const authorizedOracle = await this.creditRegistry.oracle();
      const isAuthorized = authorizedOracle.toLowerCase() === this.wallet.address.toLowerCase();
      
      if (isAuthorized) {
        console.log('✅ Oracle is authorized in contract');
      } else {
        console.error('❌ Oracle NOT authorized! Expected:', this.wallet.address);
        console.error('   But contract has:', authorizedOracle);
      }
      
      return isAuthorized;
    } catch (error) {
      console.error('Error verifying oracle authorization:', error);
      return false;
    }
  }
}


export async function batchUpdateScores(
  oracle: CreditOracle,
  addresses: string[]
): Promise<void> {
  console.log(`\n📦 Batch updating ${addresses.length} scores...`);

  for (const address of addresses) {
    try {
      await oracle.updateCreditScore(address);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error(`Failed to update ${address}:`, error.message);
    }
  }

  console.log('✅ Batch update complete');
}