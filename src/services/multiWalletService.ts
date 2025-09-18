import AsyncStorage from '@react-native-async-storage/async-storage';
import { bitcoinService } from './bitcoinService';

export interface WalletInfo {
  id: string;
  name: string;
  address: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  mnemonic: string;
}

export class MultiWalletService {
  private readonly STORAGE_KEY = 'multiple_wallets';
  private readonly ACTIVE_WALLET_KEY = 'active_wallet_id';

  // Salvar múltiplas carteiras
  async saveWallets(wallets: WalletInfo[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets));
      console.log('✅ Múltiplas carteiras salvas:', wallets.length);
    } catch (error) {
      console.error('❌ Erro ao salvar múltiplas carteiras:', error);
      throw error;
    }
  }

  // Carregar múltiplas carteiras
  async loadWallets(): Promise<WalletInfo[]> {
    try {
      const walletsData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (walletsData) {
        const wallets = JSON.parse(walletsData);
        console.log('✅ Múltiplas carteiras carregadas:', wallets.length);
        return wallets;
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao carregar múltiplas carteiras:', error);
      return [];
    }
  }

  // Adicionar nova carteira
  async addWallet(walletInfo: WalletInfo): Promise<void> {
    try {
      const existingWallets = await this.loadWallets();
      
      // Desativar todas as outras carteiras
      const updatedWallets = existingWallets.map(wallet => ({
        ...wallet,
        isActive: false
      }));
      
      // Adicionar nova carteira como ativa
      updatedWallets.push({
        ...walletInfo,
        isActive: true
      });
      
      await this.saveWallets(updatedWallets);
      await this.setActiveWallet(walletInfo.id);
      
      console.log('✅ Nova carteira adicionada:', walletInfo.name);
    } catch (error) {
      console.error('❌ Erro ao adicionar carteira:', error);
      throw error;
    }
  }

  // Definir carteira ativa
  async setActiveWallet(walletId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ACTIVE_WALLET_KEY, walletId);
      
      // Atualizar status das carteiras
      const wallets = await this.loadWallets();
      const updatedWallets = wallets.map(wallet => ({
        ...wallet,
        isActive: wallet.id === walletId
      }));
      
      await this.saveWallets(updatedWallets);
      console.log('✅ Carteira ativa definida:', walletId);
    } catch (error) {
      console.error('❌ Erro ao definir carteira ativa:', error);
      throw error;
    }
  }

  // Obter carteira ativa
  async getActiveWallet(): Promise<WalletInfo | null> {
    try {
      const activeWalletId = await AsyncStorage.getItem(this.ACTIVE_WALLET_KEY);
      if (!activeWalletId) return null;
      
      const wallets = await this.loadWallets();
      return wallets.find(wallet => wallet.id === activeWalletId) || null;
    } catch (error) {
      console.error('❌ Erro ao obter carteira ativa:', error);
      return null;
    }
  }

  // Migrar carteira atual para sistema de múltiplas carteiras
  async migrateCurrentWallet(): Promise<void> {
    try {
      const existingWallets = await this.loadWallets();
      
      // Se já existem carteiras, não migrar
      if (existingWallets.length > 0) {
        console.log('✅ Sistema de múltiplas carteiras já existe');
        return;
      }
      
      // Verificar se há carteira atual
      const hasCurrentWallet = await bitcoinService.instance.hasWallet();
      if (!hasCurrentWallet) {
        console.log('✅ Nenhuma carteira atual para migrar');
        return;
      }
      
      // Carregar carteira atual
      const currentWallet = await bitcoinService.instance.loadWallet();
      if (!currentWallet) {
        console.log('✅ Carteira atual não encontrada');
        return;
      }
      
      // Criar WalletInfo da carteira atual
      const walletInfo: WalletInfo = {
        id: '1',
        name: 'Carteira 1',
        address: currentWallet.addresses?.bech32 || currentWallet.addresses?.p2pkh || 'N/A',
        balance: 0, // Será carregado do backend
        isActive: true,
        createdAt: new Date().toISOString(),
        mnemonic: currentWallet.mnemonic || ''
      };
      
      // Salvar como primeira carteira
      await this.saveWallets([walletInfo]);
      await this.setActiveWallet(walletInfo.id);
      
      console.log('✅ Carteira atual migrada para sistema de múltiplas carteiras');
    } catch (error) {
      console.error('❌ Erro ao migrar carteira atual:', error);
      throw error;
    }
  }

  // Remover carteira
  async removeWallet(walletId: string): Promise<void> {
    try {
      const wallets = await this.loadWallets();
      const updatedWallets = wallets.filter(wallet => wallet.id !== walletId);
      
      // Se a carteira removida era ativa, ativar a primeira disponível
      if (updatedWallets.length > 0) {
        updatedWallets[0].isActive = true;
        await this.setActiveWallet(updatedWallets[0].id);
      }
      
      await this.saveWallets(updatedWallets);
      console.log('✅ Carteira removida:', walletId);
    } catch (error) {
      console.error('❌ Erro ao remover carteira:', error);
      throw error;
    }
  }

  // Gerar ID único para nova carteira
  generateWalletId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

export const multiWalletService = new MultiWalletService();
