import dotenv from "dotenv";
dotenv.config();

export const NETWORK = {
  name: "sepolia",
  chainId: 11155111,
  rpcUrl: process.env.RPC_URL || "https://rpc.sepolia.org",
  gatewayUrl: process.env.GATEWAY_URL || "https://gateway.zama.ai",
};

export const CONTRACTS = {
  creditRegistry: process.env.CREDIT_REGISTRY_ADDRESS || "",
  lendingPool: process.env.LENDING_POOL_ADDRESS || "",
};

export const ORACLE = {
  privateKey: process.env.ORACLE_PRIVATE_KEY || "",
  address: process.env.ORACLE_ADDRESS || "",
  updateInterval: 3600,
};

export const SCORING = {
  minScore: 300,
  maxScore: 850,
  baseScore: 500,

  weights: {
    hasLendingActivity: 100,
    neverLiquidated: 50,
    accountAge: 100,
    multiProtocol: 50,
    perfectRepayment: 150,
  },

  thresholds: {
    accountAgeMonths: 6,
    minProtocols: 2,
  },
};

export const PROTOCOLS = {
  aaveLendingPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  aaveDataProvider: "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31",
  compoundComet: "0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e",
};

export function validateConfig(): void {
  const required = [
    { key: "ORACLE_PRIVATE_KEY", value: ORACLE.privateKey },
    { key: "RPC_URL", value: NETWORK.rpcUrl },
  ];

  const missing = required.filter((item) => !item.value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing
        .map((m) => m.key)
        .join(", ")}`
    );
  }

  console.log("✅ Configuration validated");
  console.log(`📡 Network: ${NETWORK.name}`);
  console.log(
    `🏛️ Credit Registry: ${CONTRACTS.creditRegistry || "Not deployed yet"}`
  );
  console.log(
    `🏦 Lending Pool: ${CONTRACTS.lendingPool || "Not deployed yet"}`
  );
}
