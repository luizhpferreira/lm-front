// Utilitário para fazer backup da carteira
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletBackup {
  timestamp: string;
  mnemonic: string;
  seed: number[];
  backupInfo: {
    hasMnemonic: boolean;
    hasSeed: boolean;
    seedLength: number;
  };
}

export async function backupWallet(): Promise<WalletBackup | null> {
  try {
    console.log('🔍 Fazendo backup da carteira...');
    
    // Verificar se existe uma carteira salva
    const walletData = await AsyncStorage.getItem('bitcoin_wallet');
    
    if (!walletData) {
      console.log('❌ Nenhuma carteira encontrada para backup');
      return null;
    }
    
    // Parse dos dados
    const parsed = JSON.parse(walletData);
    
    // Criar backup
    const backup: WalletBackup = {
      timestamp: new Date().toISOString(),
      mnemonic: parsed.mnemonic || '',
      seed: parsed.seed || [],
      backupInfo: {
        hasMnemonic: !!parsed.mnemonic,
        hasSeed: !!parsed.seed,
        seedLength: parsed.seed ? parsed.seed.length : 0
      }
    };
    
    console.log('✅ Backup criado com sucesso!');
    console.log(`🔑 Mnemonic: ${backup.backupInfo.hasMnemonic ? 'Presente' : 'Ausente'}`);
    console.log(`🌱 Seed: ${backup.backupInfo.hasSeed ? 'Presente' : 'Ausente'}`);
    
    return backup;
    
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
    throw error;
  }
}

export async function restoreWalletFromBackup(backup: WalletBackup): Promise<void> {
  try {
    console.log('🔍 Restaurando carteira do backup...');
    
    const walletData = {
      mnemonic: backup.mnemonic,
      seed: backup.seed
    };
    
    await AsyncStorage.setItem('bitcoin_wallet', JSON.stringify(walletData));
    
    console.log('✅ Carteira restaurada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao restaurar carteira:', error);
    throw error;
  }
}
