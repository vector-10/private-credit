import { ethers } from "ethers";
import { NETWORK, PROTOCOLS, SCORING } from "./config";

export interface WalletActivity {
  address: string;
  hasLendingActivity: boolean;
  neverLiquidated: boolean;
  accountAgeMonths: number;
  protocolCount: number;
  repaymentHistory: "none" | "poor" | "average" | "good" | "strong";
  totalBorrowedUSD: number;
  totalRepaidUSD: number;
}

export async function scanWalletActivity(address: string): Promise<walletActivity> {
    console.log(`📊 Scanning wallet: ${address}`);

    const mockData = generateMockData(address);
  
    console.log(`✅ Scan complete:`, {
      hasActivity: mockData.hasLendingActivity,
      liquidated: !mockData.neverLiquidated,
      age: `${mockData.accountAgeMonths} months`,
      protocols: mockData.protocolCount,
      repayment: mockData.repaymentHistory
    });
    
    return mockData;

}

function generateMockData(address: string): WalletActivity {

    const lastChar = address.slice(-1).toLowerCase();
    const charCode = lastChar.charCodeAt(0);

    const profileType = charCode % 4;

    switch (profileType) {
        case 0: 
          return {
            address,
            hasLendingActivity: true,
            neverLiquidated: true,
            accountAgeMonths: 12,
            protocolCount: 3,
            repaymentHistory: 'strong',
            totalBorrowedUSD: 50000,
            totalRepaidUSD: 50000
          };
          
        case 1: 
          return {
            address,
            hasLendingActivity: true,
            neverLiquidated: true,
            accountAgeMonths: 8,
            protocolCount: 2,
            repaymentHistory: 'good',
            totalBorrowedUSD: 25000,
            totalRepaidUSD: 25000
          };
          
        case 2: 
          return {
            address,
            hasLendingActivity: true,
            neverLiquidated: true,
            accountAgeMonths: 4,
            protocolCount: 1,
            repaymentHistory: 'average',
            totalBorrowedUSD: 10000,
            totalRepaidUSD: 9500
          };
          
        case 3:
        default:
          return {
            address,
            hasLendingActivity: false,
            neverLiquidated: true,
            accountAgeMonths: 1,
            protocolCount: 0,
            repaymentHistory: 'none',
            totalBorrowedUSD: 0,
            totalRepaidUSD: 0
          };
      }

      export async function scanAaveActivity(address: string): Promise<Partial<WalletActivity>> {
        
        console.log('⚠️  Real Aave scanning not implemented yet - using mock data');
        return {};
      }

      export async function scanCompoundActivity(address: string): Promise<Partial<WalletActivity>> {
        
        console.log('⚠️  Real Compound scanning not implemented yet - using mock data');
        return {};
      }

      export async function getWalletAge(address: string): Promise<number> {
        try {
          const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
          
          const currentBlock = await provider.getBlockNumber();
          
          console.log('⚠️  Using mock wallet age - implement Etherscan API for production');
          
          const mockAgeMonths = Math.floor(Math.random() * 24) + 1;
          return mockAgeMonths;
          
        } catch (error) {
          console.error('Error getting wallet age:', error);
          return 0;
        }
      }

}