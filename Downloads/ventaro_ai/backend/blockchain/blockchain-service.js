// Ventaro AI - Blockchain Integration Service
// Comprehensive Web3, cryptocurrency, and smart contract functionality

const { ethers } = require('ethers');
const Web3 = require('web3');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');
const { createHash } = require('crypto');
const { Alchemy, Network } = require('alchemy-sdk');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/blockchain.log' }),
    new winston.transports.Console()
  ]
});

class BlockchainService {
  constructor() {
    this.networks = {
      ethereum: {
        mainnet: {
          rpc: process.env.ETHEREUM_MAINNET_RPC || 'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
          chainId: 1,
          name: 'Ethereum Mainnet'
        },
        goerli: {
          rpc: process.env.ETHEREUM_GOERLI_RPC || 'https://goerli.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
          chainId: 5,
          name: 'Goerli Testnet'
        },
        polygon: {
          rpc: process.env.POLYGON_RPC || 'https://polygon-mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
          chainId: 137,
          name: 'Polygon Mainnet'
        },
        bsc: {
          rpc: process.env.BSC_RPC || 'https://bsc-dataseed.binance.org/',
          chainId: 56,
          name: 'Binance Smart Chain'
        }
      },
      solana: {
        mainnet: {
          rpc: process.env.SOLANA_MAINNET_RPC || clusterApiUrl('mainnet-beta'),
          name: 'Solana Mainnet'
        },
        devnet: {
          rpc: process.env.SOLANA_DEVNET_RPC || clusterApiUrl('devnet'),
          name: 'Solana Devnet'
        }
      }
    };

    this.providers = {};
    this.web3Instances = {};
    this.contracts = {};
    
    this.initializeProviders();
    this.initializeContracts();
  }

  async initializeProviders() {
    try {
      // Initialize Ethereum providers
      Object.entries(this.networks.ethereum).forEach(([network, config]) => {
        this.providers[network] = new ethers.JsonRpcProvider(config.rpc);
        this.web3Instances[network] = new Web3(config.rpc);
      });

      // Initialize Alchemy SDK
      if (process.env.ALCHEMY_API_KEY) {
        this.alchemy = new Alchemy({
          apiKey: process.env.ALCHEMY_API_KEY,
          network: Network.ETH_MAINNET
        });
      }

      // Initialize Solana connection
      this.solanaConnection = new Connection(this.networks.solana.mainnet.rpc);
      
      // Initialize Metaplex for Solana NFTs
      this.metaplex = Metaplex.make(this.solanaConnection);

      logger.info('Blockchain providers initialized successfully');
    } catch (error) {
      logger.error('Error initializing blockchain providers:', error);
    }
  }

  async initializeContracts() {
    try {
      // Smart contract ABIs and addresses
      this.contractConfigs = {
        ventaroToken: {
          address: process.env.VENTARO_TOKEN_ADDRESS,
          abi: require('./abis/VentaroToken.json')
        },
        ventaroNFT: {
          address: process.env.VENTARO_NFT_ADDRESS,
          abi: require('./abis/VentaroNFT.json')
        },
        ventaroStaking: {
          address: process.env.VENTARO_STAKING_ADDRESS,
          abi: require('./abis/VentaroStaking.json')
        },
        ventaroDAO: {
          address: process.env.VENTARO_DAO_ADDRESS,
          abi: require('./abis/VentaroDAO.json')
        },
        ventaroMarketplace: {
          address: process.env.VENTARO_MARKETPLACE_ADDRESS,
          abi: require('./abis/VentaroMarketplace.json')
        }
      };

      // Initialize contract instances
      Object.entries(this.contractConfigs).forEach(([name, config]) => {
        if (config.address && config.abi) {
          this.contracts[name] = {
            mainnet: new ethers.Contract(config.address, config.abi, this.providers.mainnet),
            polygon: new ethers.Contract(config.address, config.abi, this.providers.polygon)
          };
        }
      });

      logger.info('Smart contracts initialized successfully');
    } catch (error) {
      logger.error('Error initializing smart contracts:', error);
    }
  }

  // Wallet Management
  async createWallet(network = 'ethereum') {
    try {
      let wallet;
      
      if (network === 'ethereum' || network === 'polygon' || network === 'bsc') {
        wallet = ethers.Wallet.createRandom();
        return {
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: wallet.mnemonic.phrase,
          network
        };
      } else if (network === 'solana') {
        const { Keypair } = require('@solana/web3.js');
        const keypair = Keypair.generate();
        return {
          address: keypair.publicKey.toString(),
          privateKey: Buffer.from(keypair.secretKey).toString('hex'),
          network
        };
      }
      
      throw new Error(`Unsupported network: ${network}`);
    } catch (error) {
      logger.error('Wallet creation error:', error);
      throw error;
    }
  }

  async importWallet(privateKey, network = 'ethereum') {
    try {
      if (network === 'ethereum' || network === 'polygon' || network === 'bsc') {
        const wallet = new ethers.Wallet(privateKey, this.providers[network]);
        return {
          address: wallet.address,
          privateKey: wallet.privateKey,
          network
        };
      } else if (network === 'solana') {
        const { Keypair } = require('@solana/web3.js');
        const secretKey = Buffer.from(privateKey, 'hex');
        const keypair = Keypair.fromSecretKey(secretKey);
        return {
          address: keypair.publicKey.toString(),
          privateKey,
          network
        };
      }
      
      throw new Error(`Unsupported network: ${network}`);
    } catch (error) {
      logger.error('Wallet import error:', error);
      throw error;
    }
  }

  // Balance and Transaction Management
  async getBalance(address, network = 'mainnet', tokenAddress = null) {
    try {
      if (tokenAddress) {
        // ERC-20 token balance
        const tokenABI = [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, this.providers[network]);
        const balance = await tokenContract.balanceOf(address);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        
        return {
          balance: ethers.formatUnits(balance, decimals),
          decimals,
          symbol,
          raw: balance.toString()
        };
      } else {
        // Native token balance
        if (network.includes('solana')) {
          const balance = await this.solanaConnection.getBalance(new PublicKey(address));
          return {
            balance: (balance / 1e9).toString(), // Convert lamports to SOL
            symbol: 'SOL',
            raw: balance.toString()
          };
        } else {
          const balance = await this.providers[network].getBalance(address);
          return {
            balance: ethers.formatEther(balance),
            symbol: this.getNetworkSymbol(network),
            raw: balance.toString()
          };
        }
      }
    } catch (error) {
      logger.error('Balance retrieval error:', error);
      throw error;
    }
  }

  async sendTransaction(fromPrivateKey, toAddress, amount, network = 'mainnet', tokenAddress = null) {
    try {
      const wallet = new ethers.Wallet(fromPrivateKey, this.providers[network]);
      
      if (tokenAddress) {
        // ERC-20 token transfer
        const tokenABI = [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)'
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.parseUnits(amount.toString(), decimals);
        
        const tx = await tokenContract.transfer(toAddress, amountWei);
        const receipt = await tx.wait();
        
        return {
          hash: tx.hash,
          receipt,
          network,
          type: 'token_transfer'
        };
      } else {
        // Native token transfer
        const tx = await wallet.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amount.toString())
        });
        
        const receipt = await tx.wait();
        
        return {
          hash: tx.hash,
          receipt,
          network,
          type: 'native_transfer'
        };
      }
    } catch (error) {
      logger.error('Transaction error:', error);
      throw error;
    }
  }

  // NFT Management
  async mintNFT(recipientAddress, tokenURI, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroNFT || !this.contracts.ventaroNFT[network]) {
        throw new Error('Ventaro NFT contract not initialized');
      }

      const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, this.providers[network]);
      const nftContract = this.contracts.ventaroNFT[network].connect(wallet);
      
      const tx = await nftContract.mint(recipientAddress, tokenURI);
      const receipt = await tx.wait();
      
      // Extract token ID from events
      const transferEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id('Transfer(address,address,uint256)')
      );
      
      const tokenId = transferEvent ? parseInt(transferEvent.topics[3], 16) : null;
      
      return {
        hash: tx.hash,
        receipt,
        tokenId,
        tokenURI,
        network
      };
    } catch (error) {
      logger.error('NFT minting error:', error);
      throw error;
    }
  }

  async getNFTMetadata(tokenId, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroNFT || !this.contracts.ventaroNFT[network]) {
        throw new Error('Ventaro NFT contract not initialized');
      }

      const nftContract = this.contracts.ventaroNFT[network];
      const tokenURI = await nftContract.tokenURI(tokenId);
      
      // Fetch metadata from IPFS or HTTP
      const response = await axios.get(tokenURI);
      const metadata = response.data;
      
      return {
        tokenId,
        tokenURI,
        metadata,
        network
      };
    } catch (error) {
      logger.error('NFT metadata retrieval error:', error);
      throw error;
    }
  }

  async transferNFT(fromPrivateKey, toAddress, tokenId, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroNFT || !this.contracts.ventaroNFT[network]) {
        throw new Error('Ventaro NFT contract not initialized');
      }

      const wallet = new ethers.Wallet(fromPrivateKey, this.providers[network]);
      const nftContract = this.contracts.ventaroNFT[network].connect(wallet);
      
      const tx = await nftContract.transferFrom(wallet.address, toAddress, tokenId);
      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        receipt,
        tokenId,
        from: wallet.address,
        to: toAddress,
        network
      };
    } catch (error) {
      logger.error('NFT transfer error:', error);
      throw error;
    }
  }

  // DeFi and Staking
  async stakeTokens(userPrivateKey, amount, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroStaking || !this.contracts.ventaroStaking[network]) {
        throw new Error('Ventaro Staking contract not initialized');
      }

      const wallet = new ethers.Wallet(userPrivateKey, this.providers[network]);
      const stakingContract = this.contracts.ventaroStaking[network].connect(wallet);
      const tokenContract = this.contracts.ventaroToken[network].connect(wallet);
      
      // First approve the staking contract to spend tokens
      const amountWei = ethers.parseEther(amount.toString());
      const approveTx = await tokenContract.approve(stakingContract.target, amountWei);
      await approveTx.wait();
      
      // Then stake the tokens
      const stakeTx = await stakingContract.stake(amountWei);
      const receipt = await stakeTx.wait();
      
      return {
        hash: stakeTx.hash,
        receipt,
        amount,
        network
      };
    } catch (error) {
      logger.error('Token staking error:', error);
      throw error;
    }
  }

  async unstakeTokens(userPrivateKey, amount, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroStaking || !this.contracts.ventaroStaking[network]) {
        throw new Error('Ventaro Staking contract not initialized');
      }

      const wallet = new ethers.Wallet(userPrivateKey, this.providers[network]);
      const stakingContract = this.contracts.ventaroStaking[network].connect(wallet);
      
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await stakingContract.unstake(amountWei);
      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        receipt,
        amount,
        network
      };
    } catch (error) {
      logger.error('Token unstaking error:', error);
      throw error;
    }
  }

  async getStakingInfo(userAddress, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroStaking || !this.contracts.ventaroStaking[network]) {
        throw new Error('Ventaro Staking contract not initialized');
      }

      const stakingContract = this.contracts.ventaroStaking[network];
      
      const stakedAmount = await stakingContract.stakedBalance(userAddress);
      const pendingRewards = await stakingContract.pendingRewards(userAddress);
      const stakingAPY = await stakingContract.getAPY();
      
      return {
        stakedAmount: ethers.formatEther(stakedAmount),
        pendingRewards: ethers.formatEther(pendingRewards),
        stakingAPY: stakingAPY.toString(),
        network
      };
    } catch (error) {
      logger.error('Staking info retrieval error:', error);
      throw error;
    }
  }

  // DAO Governance
  async createProposal(creatorPrivateKey, title, description, actions, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroDAO || !this.contracts.ventaroDAO[network]) {
        throw new Error('Ventaro DAO contract not initialized');
      }

      const wallet = new ethers.Wallet(creatorPrivateKey, this.providers[network]);
      const daoContract = this.contracts.ventaroDAO[network].connect(wallet);
      
      const tx = await daoContract.createProposal(title, description, actions);
      const receipt = await tx.wait();
      
      // Extract proposal ID from events
      const proposalEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id('ProposalCreated(uint256,address,string,string)')
      );
      
      const proposalId = proposalEvent ? parseInt(proposalEvent.topics[1], 16) : null;
      
      return {
        hash: tx.hash,
        receipt,
        proposalId,
        title,
        description,
        network
      };
    } catch (error) {
      logger.error('Proposal creation error:', error);
      throw error;
    }
  }

  async voteOnProposal(voterPrivateKey, proposalId, support, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroDAO || !this.contracts.ventaroDAO[network]) {
        throw new Error('Ventaro DAO contract not initialized');
      }

      const wallet = new ethers.Wallet(voterPrivateKey, this.providers[network]);
      const daoContract = this.contracts.ventaroDAO[network].connect(wallet);
      
      const tx = await daoContract.vote(proposalId, support);
      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        receipt,
        proposalId,
        support,
        voter: wallet.address,
        network
      };
    } catch (error) {
      logger.error('Voting error:', error);
      throw error;
    }
  }

  async getProposal(proposalId, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroDAO || !this.contracts.ventaroDAO[network]) {
        throw new Error('Ventaro DAO contract not initialized');
      }

      const daoContract = this.contracts.ventaroDAO[network];
      const proposal = await daoContract.proposals(proposalId);
      
      return {
        id: proposalId,
        title: proposal.title,
        description: proposal.description,
        creator: proposal.creator,
        forVotes: ethers.formatEther(proposal.forVotes),
        againstVotes: ethers.formatEther(proposal.againstVotes),
        startTime: new Date(Number(proposal.startTime) * 1000),
        endTime: new Date(Number(proposal.endTime) * 1000),
        executed: proposal.executed,
        network
      };
    } catch (error) {
      logger.error('Proposal retrieval error:', error);
      throw error;
    }
  }

  // Marketplace Functions
  async listNFTForSale(sellerPrivateKey, tokenId, price, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroMarketplace || !this.contracts.ventaroMarketplace[network]) {
        throw new Error('Ventaro Marketplace contract not initialized');
      }

      const wallet = new ethers.Wallet(sellerPrivateKey, this.providers[network]);
      const marketplaceContract = this.contracts.ventaroMarketplace[network].connect(wallet);
      const nftContract = this.contracts.ventaroNFT[network].connect(wallet);
      
      // First approve the marketplace to transfer the NFT
      const approveTx = await nftContract.approve(marketplaceContract.target, tokenId);
      await approveTx.wait();
      
      // Then list the NFT for sale
      const priceWei = ethers.parseEther(price.toString());
      const listTx = await marketplaceContract.listNFT(tokenId, priceWei);
      const receipt = await listTx.wait();
      
      return {
        hash: listTx.hash,
        receipt,
        tokenId,
        price,
        seller: wallet.address,
        network
      };
    } catch (error) {
      logger.error('NFT listing error:', error);
      throw error;
    }
  }

  async buyNFT(buyerPrivateKey, tokenId, network = 'mainnet') {
    try {
      if (!this.contracts.ventaroMarketplace || !this.contracts.ventaroMarketplace[network]) {
        throw new Error('Ventaro Marketplace contract not initialized');
      }

      const wallet = new ethers.Wallet(buyerPrivateKey, this.providers[network]);
      const marketplaceContract = this.contracts.ventaroMarketplace[network].connect(wallet);
      
      // Get the listing price
      const listing = await marketplaceContract.listings(tokenId);
      const price = listing.price;
      
      const tx = await marketplaceContract.buyNFT(tokenId, { value: price });
      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        receipt,
        tokenId,
        price: ethers.formatEther(price),
        buyer: wallet.address,
        network
      };
    } catch (error) {
      logger.error('NFT purchase error:', error);
      throw error;
    }
  }

  // Cryptocurrency Price Feeds
  async getCryptoPrices(symbols = ['BTC', 'ETH', 'MATIC', 'SOL']) {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: symbols.map(s => this.getCoinGeckoId(s)).join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true
        }
      });
      
      const prices = {};
      symbols.forEach(symbol => {
        const id = this.getCoinGeckoId(symbol);
        if (response.data[id]) {
          prices[symbol] = {
            price: response.data[id].usd,
            change24h: response.data[id].usd_24h_change,
            marketCap: response.data[id].usd_market_cap
          };
        }
      });
      
      return prices;
    } catch (error) {
      logger.error('Price feed error:', error);
      throw error;
    }
  }

  // Utility Functions
  getNetworkSymbol(network) {
    const symbols = {
      mainnet: 'ETH',
      goerli: 'ETH',
      polygon: 'MATIC',
      bsc: 'BNB'
    };
    return symbols[network] || 'ETH';
  }

  getCoinGeckoId(symbol) {
    const ids = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'MATIC': 'matic-network',
      'SOL': 'solana',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'LINK': 'chainlink'
    };
    return ids[symbol] || symbol.toLowerCase();
  }

  async validateAddress(address, network = 'ethereum') {
    try {
      if (network === 'ethereum' || network === 'polygon' || network === 'bsc') {
        return ethers.isAddress(address);
      } else if (network === 'solana') {
        try {
          new PublicKey(address);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async getTransactionHistory(address, network = 'mainnet', limit = 10) {
    try {
      if (this.alchemy && (network === 'mainnet' || network === 'goerli')) {
        const transfers = await this.alchemy.core.getAssetTransfers({
          fromAddress: address,
          toAddress: address,
          category: ['external', 'erc20', 'erc721'],
          maxCount: limit
        });
        
        return transfers.transfers.map(transfer => ({
          hash: transfer.hash,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value,
          asset: transfer.asset,
          category: transfer.category,
          blockNum: transfer.blockNum,
          timestamp: transfer.metadata?.blockTimestamp
        }));
      }
      
      // Fallback to basic provider method
      const provider = this.providers[network];
      const latestBlock = await provider.getBlockNumber();
      const transactions = [];
      
      // This is a simplified implementation
      // In production, you'd want to use indexing services
      for (let i = 0; i < Math.min(limit, 100); i++) {
        const block = await provider.getBlock(latestBlock - i, true);
        if (block && block.transactions) {
          const relevantTxs = block.transactions.filter(tx => 
            tx.from === address || tx.to === address
          );
          transactions.push(...relevantTxs);
          if (transactions.length >= limit) break;
        }
      }
      
      return transactions.slice(0, limit);
    } catch (error) {
      logger.error('Transaction history error:', error);
      throw error;
    }
  }

  // Security and Encryption
  encryptPrivateKey(privateKey, password) {
    try {
      const algorithm = 'aes-256-gcm';
      const salt = crypto.randomBytes(16);
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(salt);
      
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Private key encryption error:', error);
      throw error;
    }
  }

  decryptPrivateKey(encryptedData, password) {
    try {
      const algorithm = 'aes-256-gcm';
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(salt);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Private key decryption error:', error);
      throw error;
    }
  }
}

module.exports = BlockchainService;