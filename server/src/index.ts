// server/src/index.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import { CreditOracle, batchUpdateScores } from './oracle';
import { API, validateConfig } from './config';


const app = express();


app.use(cors({ origin: API.corsOrigin }));
app.use(express.json());


let oracle: CreditOracle | null = null;


app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Private Credit Oracle',
    oracle: oracle ? 'initialized' : 'not initialized'
  });
});


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


app.post('/api/score/:address', async (req: Request, res: Response) => {
  try {
    if (!oracle) {
      return res.status(503).json({ error: 'Oracle not initialized' });
    }

    const { address } = req.params;

    console.log(`\n📨 Received score update request for: ${address}`);

    const exists = await oracle.hasScore(address);
    if (exists) {
      console.log('⚠️  Score already exists - will update anyway');
    }

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


app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});


async function startServer() {
  try {
    console.log('\n🚀 Starting Private Credit Oracle Server...\n');


    validateConfig();

    console.log('\n🤖 Initializing Credit Oracle...');
    oracle = new CreditOracle();


    const isAuthorized = await oracle.verifyOracleAuthorization();
    if (!isAuthorized) {
      console.warn('\n⚠️  WARNING: Oracle not authorized in contract!');
      console.warn('   Deploy contracts with this oracle address or update contract.\n');
    }

    const balance = await oracle.getOracleBalance();
    console.log(`💰 Oracle balance: ${balance} ETH`);
    
    if (parseFloat(balance) < 0.01) {
      console.warn('⚠️  WARNING: Low oracle balance! Fund with testnet ETH.\n');
    }


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


process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});


startServer();