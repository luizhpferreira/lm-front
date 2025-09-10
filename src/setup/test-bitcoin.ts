// Teste simples para verificar se as bibliotecas Bitcoin estão funcionando
import * as bip39 from 'bip39';
import { fromSeed } from 'bip32';

export const testBitcoinLibraries = () => {
  try {
    console.log('🧪 Testando bibliotecas Bitcoin...');
    
    // Teste 1: Gerar mnemônico
    console.log('🔍 Teste 1: Gerando mnemônico...');
    const mnemonic = bip39.generateMnemonic(256);
    console.log('✅ Mnemônico gerado:', mnemonic);
    
    // Teste 2: Validar mnemônico
    console.log('🔍 Teste 2: Validando mnemônico...');
    const isValid = bip39.validateMnemonic(mnemonic);
    console.log('✅ Mnemônico válido:', isValid);
    
    // Teste 3: Gerar seed
    console.log('🔍 Teste 3: Gerando seed...');
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    console.log('✅ Seed gerado, tamanho:', seed.length);
    
    if (!seed || seed.length === 0) {
      throw new Error('Seed é null ou vazio');
    }
    
    // Teste 4: Criar chave mestra
    console.log('🔍 Teste 4: Criando chave mestra BIP32...');
    const masterKey = fromSeed(seed);
    console.log('✅ Chave mestra criada:', !!masterKey);
    
    if (!masterKey) {
      throw new Error('Chave mestra é null');
    }
    
    // Teste 5: Derivar chave
    console.log('🔍 Teste 5: Derivando chave...');
    const derivedKey = masterKey.derivePath("m/44'/0'/0'/0/0");
    console.log('✅ Chave derivada:', !!derivedKey);
    
    console.log('🎉 Todos os testes passaram!');
    return true;
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    return false;
  }
};
