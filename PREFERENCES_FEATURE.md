# Funcionalidade de Preferências

## Visão Geral

Foi implementada uma nova tela de preferências no aplicativo Luma Mobile, que permite aos usuários gerenciar suas configurações de conta de forma organizada e intuitiva.

## Funcionalidades Implementadas

### 1. Tela de Preferências (`PreferencesScreen.tsx`)

- **Localização**: `src/screens/PreferencesScreen.tsx`
- **Funcionalidades**:
  - Interface limpa e moderna com cards organizados
  - Seção "Informações da Conta" com CPF, Email e Wallet ID
  - Seção "Informações da Carteira" com ID, data de criação e atualização
  - Seção "Sobre" com informações do aplicativo
  - Seção "Encerrar Sessão" como última opção
  - Navegação de volta para a tela anterior
  - Confirmação antes de encerrar a sessão

### 2. Navegação Atualizada

- **Arquivo**: `src/navigation/AppNavigator.tsx`
- **Mudanças**:
  - Adicionada nova rota `Preferences`
  - Integração com o sistema de navegação existente

### 3. HomeScreen Modificada

- **Arquivo**: `src/screens/HomeScreen.tsx`
- **Mudanças**:
  - Removido botão "Sair" do header
  - Adicionado botão de configurações (⚙️) no header
  - Removidas informações da conta e carteira (movidas para preferências)
  - Foco nas ações principais (Criar Invoice, Verificar Pagamento)
  - Navegação para a tela de preferências

## Estrutura da Interface

### Header da Tela de Preferências
```
[←] Preferências    [espaço]
```

### Seção Informações da Conta
```
┌─────────────────────────────────┐
│ Informações da Conta            │
├─────────────────────────────────┤
│ CPF:                123.456.789-00 │
│ Email:              user@email.com │
│ Wallet ID:          wallet_123     │
└─────────────────────────────────┘
```

### Seção Informações da Carteira
```
┌─────────────────────────────────┐
│ Informações da Carteira         │
├─────────────────────────────────┤
│ ID:                 wallet_123   │
│ Criada em:          24/08/2024   │
│ Atualizada em:      24/08/2024   │
└─────────────────────────────────┘
```

### Seção Sobre
```
┌─────────────────────────────────┐
│ Sobre                           │
├─────────────────────────────────┤
│ Versão do App        1.0.0      │
│ Desenvolvido por    BFF Luma    │
└─────────────────────────────────┘
```

### Seção Encerrar Sessão
```
┌─────────────────────────────────┐
│ 🚪 Encerrar Sessão ›            │
│    Sair da sua conta atual      │
└─────────────────────────────────┘
```

## Fluxo de Uso

1. **Acesso**: Usuário toca no ícone ⚙️ no header da HomeScreen
2. **Navegação**: Aplicativo navega para a tela de Preferências
3. **Visualização**: Usuário pode ver:
   - Informações da conta (CPF, Email, Wallet ID)
   - Informações da carteira (ID, datas de criação/atualização)
   - Informações sobre o aplicativo
4. **Encerrar Sessão**: 
   - Usuário toca em "Encerrar Sessão" (última opção)
   - Aparece confirmação: "Tem certeza que deseja encerrar sua sessão?"
   - Se confirmado, executa logout e retorna para tela de login

## Benefícios da Implementação

### Organização
- Separação clara entre funcionalidades principais e configurações
- Interface mais limpa na tela principal

### Experiência do Usuário
- Fluxo intuitivo para gerenciar preferências
- Confirmação antes de ações importantes
- Design consistente com o resto do aplicativo

### Escalabilidade
- Estrutura preparada para futuras opções de preferências
- Fácil adição de novas seções e funcionalidades

## Tecnologias Utilizadas

- **React Native**: Framework principal
- **TypeScript**: Tipagem estática
- **React Navigation**: Sistema de navegação
- **Context API**: Gerenciamento de estado de autenticação

## Arquivos Modificados

1. `src/screens/PreferencesScreen.tsx` - Nova tela criada
2. `src/navigation/AppNavigator.tsx` - Navegação atualizada
3. `src/screens/HomeScreen.tsx` - Header modificado

## Testes

Execute o script de teste para verificar a implementação:
```bash
./test_preferences.sh
```

## Próximos Passos

A estrutura está preparada para adicionar mais opções de preferências no futuro, como:
- Configurações de notificações
- Preferências de privacidade
- Configurações de tema
- Informações da conta
- Histórico de transações
