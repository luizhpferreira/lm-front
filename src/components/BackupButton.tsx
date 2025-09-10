import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { backupWallet, restoreWalletFromBackup, WalletBackup } from '../utils/backupWallet';

export const BackupButton: React.FC = () => {
  const [backup, setBackup] = useState<WalletBackup | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBackup = async () => {
    try {
      setIsLoading(true);
      const walletBackup = await backupWallet();
      
      if (walletBackup) {
        setBackup(walletBackup);
        Alert.alert(
          'Backup Criado!',
          `Mnemonic: ${walletBackup.backupInfo.hasMnemonic ? 'Presente' : 'Ausente'}\nSeed: ${walletBackup.backupInfo.hasSeed ? 'Presente' : 'Ausente'}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Mostrar dados do backup no console
                console.log('📋 DADOS DO BACKUP:');
                console.log('Timestamp:', walletBackup.timestamp);
                console.log('Mnemonic:', walletBackup.mnemonic);
                console.log('Seed Length:', walletBackup.seed.length);
                console.log('Backup Info:', walletBackup.backupInfo);
              }
            }
          ]
        );
      } else {
        Alert.alert('Info', 'Nenhuma carteira encontrada para backup');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao criar backup');
      console.error('Erro no backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!backup) {
      Alert.alert('Erro', 'Nenhum backup disponível');
      return;
    }

    try {
      setIsLoading(true);
      await restoreWalletFromBackup(backup);
      Alert.alert('Sucesso', 'Carteira restaurada do backup!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao restaurar carteira');
      console.error('Erro na restauração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backup da Carteira</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.backupButton]} 
        onPress={handleBackup}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Fazendo Backup...' : 'Fazer Backup'}
        </Text>
      </TouchableOpacity>

      {backup && (
        <TouchableOpacity 
          style={[styles.button, styles.restoreButton]} 
          onPress={handleRestore}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Restaurando...' : 'Restaurar do Backup'}
          </Text>
        </TouchableOpacity>
      )}

      {backup && (
        <View style={styles.backupInfo}>
          <Text style={styles.infoText}>
            Backup criado em: {new Date(backup.timestamp).toLocaleString()}
          </Text>
          <Text style={styles.infoText}>
            Mnemonic: {backup.backupInfo.hasMnemonic ? '✅' : '❌'}
          </Text>
          <Text style={styles.infoText}>
            Seed: {backup.backupInfo.hasSeed ? '✅' : '❌'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  backupButton: {
    backgroundColor: '#007AFF',
  },
  restoreButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backupInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
});
