// server/src/index.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import { CreditOracle, batchUpdateScores } from './oracle';
import { API, validateConfig } from './config';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: API.corsOrigin }));
app.use(express.json());

// Initialize Oracle (will be set after validation)
let oracle: CreditOracle | null = null;

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Private Credit Oracle',
    oracle: oracle ? 'initialized' : 'not initialized'
  });
});

/**
 * Get oracle status and balance
 */
app.get('/api/oracle/status', async (req: Request, res: Response) => {
  try {
    if (!oracle) {
      return res.status(503).json({ error: 'Oracle not initialized' });
    }

    const balance = await oracle.getOracleBalance();
    const isAuthorized = await oracle.verifyOracleAuthorization();

    res.json({
      balance: `${balance} ETH`,
      isAuthorized,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting oracle status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate and update credit score for a specific address
 * POST /api/score/:address
 */
app.post('/api/score/:address', async (req: Request, res: Response) => {
  try {
    if (!oracle) {
      return res.status(503).json({ error: 'Oracle not initialized' });
    }

    const { address } = req.params;

    console.log(`\n📨 Received score update request for: ${address}`);

    // Check if score already exists (optional check)
    const exists = await oracle.hasScore(address);
    if (exists) {
      console.log('⚠️  Score already exists - will update anyway');
    }

    // Update score
    const result = await oracle.updateCreditScore(address);

    res.json({
      success: true,
      address,
      score: result.score,
      txHash: result.txHash,
      message: 'Credit score updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in score update:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Check if an address has a score
 * GET /api/score/:address/exists
 */
app.get('/api/score/:address/exists', async (req: Request, res: Response) => {
  try {
    if (!oracle) {
      return res.status(503).json({ error: 'Oracle not initialized' });
    }

    const { address } = req.params;
    const exists = await oracle.hasScore(address);

    res.json({
      address,
      hasScore: exists,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error checking score:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch update multiple addresses
 * POST /api/score/batch
 * Body: { addresses: string[] }
 */
app.post('/api/score/batch', async (req: Request, res: Response) => {
  try {
    if (!oracle) {
      return res.status(503).json({ error: 'Oracle not initialized' });
    }

    const { addresses } = req.body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'Invalid addresses array' });
    }

    if (addresses.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 addresses per batch' });
    }

    console.log(`\n📦 Batch update requested for ${addresses.length} addresses`);

    // Start batch update (don't await - runs in background)
    batchUpdateScores(oracle, addresses).catch(err => {
      console.error('Batch update error:', err);
    });

    res.json({
      success: true,
      message: 'Batch update started',
      count: addresses.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error starting batch update:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manual trigger endpoint (for testing)
 * POST /api/trigger
 * Body: { address: string }
 */
app.post('/api/trigger', async (req: Request, res: Response) => {
  try {
    if (!oracle) {
      return res.status(503).json({ error: 'Oracle not initialized' });
    }

    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address required in body' });
    }

    const result = await oracle.updateCreditScore(address);

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in manual trigger:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('\n🚀 Starting Private Credit Oracle Server...\n');

    // Validate configuration
    validateConfig();

    // Initialize oracle
    console.log('\n🤖 Initializing Credit Oracle...');
    oracle = new CreditOracle();

    // Verify oracle authorization
    const isAuthorized = await oracle.verifyOracleAuthorization();
    if (!isAuthorized) {
      console.warn('\n⚠️  WARNING: Oracle not authorized in contract!');
      console.warn('   Deploy contracts with this oracle address or update contract.\n');
    }

    // Check oracle balance
    const balance = await oracle.getOracleBalance();
    console.log(`💰 Oracle balance: ${balance} ETH`);
    
    if (parseFloat(balance) < 0.01) {
      console.warn('⚠️  WARNING: Low oracle balance! Fund with testnet ETH.\n');
    }

    // Start Express server
    app.listen(API.port, () => {
      console.log('\n✅ Server running!');
      console.log(`📡 Listening on: http://localhost:${API.port}`);
      console.log(`🏥 Health check: http://localhost:${API.port}/health`);
      console.log(`📊 Oracle status: http://localhost:${API.port}/api/oracle/status`);
      console.log('\n📚 API Endpoints:');
      console.log(`   POST /api/score/:address - Update credit score`);
      console.log(`   GET  /api/score/:address/exists - Check if score exists`);
      console.log(`   POST /api/score/batch - Batch update scores`);
      console.log(`   POST /api/trigger - Manual trigger (testing)`);
      console.log(`   GET  /api/oracle/status - Oracle status & balance`);
      console.log(`   GET  /health - Health check\n`);
    });

  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();