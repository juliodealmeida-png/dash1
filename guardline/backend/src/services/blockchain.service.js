/**
 * Blockchain Verification Service — Polygon Network
 * Registers document hashes on-chain for tamper-proof verification.
 * Cost: ~$0.01 per document in MATIC.
 */

const crypto = require('crypto');

// Lazy-load ethers to avoid startup crash if not installed
let ethers;
function getEthers() {
  if (!ethers) {
    try { ethers = require('ethers'); } catch(e) {
      console.warn('ethers.js not installed. Run: npm install ethers');
      return null;
    }
  }
  return ethers;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Generate SHA-256 hash of a buffer or string
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Register a document hash on Polygon blockchain
 * @param {string} documentHash - SHA-256 hex string
 * @returns {{ txHash, blockNumber, timestamp, polygonscanUrl }} or null on failure
 */
async function registerOnBlockchain(documentHash) {
  const eth = getEthers();
  if (!eth) return null;

  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
  const privateKey = process.env.POLYGON_WALLET_PRIVATE_KEY;
  const chainId = parseInt(process.env.POLYGON_CHAIN_ID || '137', 10);

  if (!privateKey) {
    console.warn('POLYGON_WALLET_PRIVATE_KEY not set — skipping blockchain registration');
    return null;
  }

  const provider = new eth.JsonRpcProvider(rpcUrl, chainId);
  const wallet = new eth.Wallet(privateKey, provider);

  // Encode hash as hex data in transaction
  const dataHex = '0x' + Buffer.from('GUARDLINE_DOC:' + documentHash).toString('hex');

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tx = await wallet.sendTransaction({
        to: wallet.address, // Send to self (no value transfer)
        value: 0,
        data: dataHex,
      });

      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toISOString(),
        polygonscanUrl: 'https://polygonscan.com/tx/' + receipt.hash,
        chainId: chainId,
        dataHex: dataHex,
      };
    } catch (e) {
      lastError = e;
      console.error(`Blockchain attempt ${attempt}/${MAX_RETRIES} failed:`, e.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  console.error('Blockchain registration failed after', MAX_RETRIES, 'attempts:', lastError?.message);
  return null;
}

/**
 * Verify if a hash exists on Polygon by checking a known transaction
 * @param {string} txHash - Transaction hash to verify
 * @param {string} expectedDocHash - Expected document hash
 * @returns {{ verified, blockNumber, timestamp, txHash }}
 */
async function verifyOnBlockchain(txHash, expectedDocHash) {
  const eth = getEthers();
  if (!eth) return { verified: false, error: 'ethers.js not available' };

  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
  const chainId = parseInt(process.env.POLYGON_CHAIN_ID || '137', 10);
  const provider = new eth.JsonRpcProvider(rpcUrl, chainId);

  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) return { verified: false, error: 'Transaction not found' };

    // Decode the data field
    const dataStr = Buffer.from(tx.data.slice(2), 'hex').toString('utf-8');
    const storedHash = dataStr.replace('GUARDLINE_DOC:', '');

    const receipt = await provider.getTransactionReceipt(txHash);
    const block = receipt ? await provider.getBlock(receipt.blockNumber) : null;

    return {
      verified: storedHash === expectedDocHash,
      blockNumber: receipt?.blockNumber,
      timestamp: block ? new Date(block.timestamp * 1000).toISOString() : null,
      txHash: txHash,
      storedHash: storedHash,
      expectedHash: expectedDocHash,
    };
  } catch(e) {
    return { verified: false, error: e.message };
  }
}

module.exports = { sha256, registerOnBlockchain, verifyOnBlockchain };
