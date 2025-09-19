# Luma Lightning

Um aplicativo mobile React Native/Expo que se comunica com o BFF Luma para gerenciar carteiras Lightning Network.

## 🚀 Funcionalidades

### ✅ Autenticação
- **Login**: Autenticação com CPF e senha
- **Cadastro**: Criação de nova carteira com CPF como identificador principal
- **Sistema de CPF**: Validação completa de CPF + formatação automática
- **Recuperação de Senha**: Solicitação de reset via email
- **Logout**: Encerramento seguro da sessão

### ✅ Gerenciamento de Carteira
- **Informações da Carteira**: Visualização de dados da carteira
- **Criar Invoice**: Geração de invoices Lightning
- **Verificar Pagamento**: Consulta de status de pagamentos

### ✅ Validações
- **Senha Forte**: Validação completa de senha com indicador visual
- **Campos Obrigatórios**: Validação de formulários
- **Tratamento de Erros**: Mensagens de erro amigáveis

## 📱 Telas do App

1. **Login Screen**: Tela de autenticação
2. **Register Screen**: Cadastro com validação de senha
3. **Forgot Password Screen**: Recuperação de senha
4. **Home Screen**: Dashboard principal com todas as funcionalidades
5. **Payment Status Screen**: Verificação de status de pagamento

## 🛠️ Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar IP do BFF
Edite o arquivo `src/services/api.ts` e altere a URL base:

**Para produção (com cloudflared tunnel):**
```typescript
private baseURL: string = 'https://luma.app.br';
```

**Para desenvolvimento local:**
```typescript
private baseURL: string = 'http://localhost:8080'; // se estiver rodando no emulador
private baseURL: string = 'http://192.168.0.12:8080'; // ou seu IP local para dispositivo físico
```

### 3. Executar o App
```bash
npm start
```

## 📋 Endpoints Utilizados

O app se comunica com os seguintes endpoints do BFF:

### Autenticação
- `POST /api/v1/wallets` - Criar carteira (cadastro com CPF, password, password_repeat)
- `POST /api/v1/login` - Login com CPF e password
- `POST /api/v1/refresh` - Refresh token
- `POST /api/v1/forgot-password` - Esqueci a senha
- `POST /api/v1/reset-password` - Reset de senha

### Carteira
- `GET /api/v1/wallets` - Obter informações da carteira
- `POST /api/v1/invoices` - Criar invoice
- `GET /api/v1/payments/status` - Verificar status do pagamento

## 🔒 Segurança

### Validação de Senha Forte
A senha deve atender aos seguintes critérios:
- **Mínimo 8 caracteres**
- **Pelo menos uma letra maiúscula**
- **Pelo menos uma letra minúscula**
- **Pelo menos um número**
- **Pelo menos um caractere especial**
- **Não pode conter sequências comuns** (123, abc, qwe, asd, zxc, password, senha)
- **Não pode ter mais de 2 caracteres iguais consecutivos**

### Armazenamento Seguro
- Tokens JWT armazenados no AsyncStorage
- Limpeza automática de tokens expirados
- Interceptors para renovação automática de tokens

## 🎨 Design

O app utiliza um design moderno e limpo com:
- **Cores**: Paleta azul (#3498db) com tons neutros
- **Tipografia**: Hierarquia clara de textos
- **Cards**: Layout em cards com sombras suaves
- **Feedback Visual**: Indicadores de loading e estados de erro
- **Responsividade**: Adaptação para diferentes tamanhos de tela

## 📱 Como Usar

### 1. Primeiro Acesso
1. Abra o app
2. Toque em "Criar nova conta"
3. Digite seu email (opcional, para futuras funcionalidades)
4. Digite seu CPF (será usado como identificador principal)
5. Digite uma senha forte (siga as validações)
6. Confirme a senha
7. Toque em "Criar Conta"

### 2. Login
1. Digite seu CPF e senha
2. Toque em "Entrar"

### 3. Dashboard Principal
- **Informações da Conta**: Visualize seus dados
- **Informações da Carteira**: Veja detalhes da carteira Lightning
- **Criar Invoice**: Gere novos invoices
- **Verificar Pagamento**: Consulte status de pagamentos

### 4. Criar Invoice
1. Toque em "Criar Invoice"
2. Digite o valor em satoshis
3. Adicione uma descrição (memo)
4. Toque em "Criar"

### 5. Verificar Pagamento
1. Toque em "Verificar Pagamento"
2. Digite o payment hash
3. Toque em "Verificar Status"

## 🔧 Desenvolvimento

### Estrutura de Arquivos
```
src/
├── contexts/
│   └── AuthContext.tsx          # Contexto de autenticação
├── navigation/
│   └── AppNavigator.tsx         # Navegação principal
├── screens/
│   ├── LoginScreen.tsx          # Tela de login
│   ├── RegisterScreen.tsx       # Tela de cadastro
│   ├── ForgotPasswordScreen.tsx # Recuperação de senha
│   ├── HomeScreen.tsx           # Dashboard principal
│   └── PaymentStatusScreen.tsx  # Verificação de pagamento
└── services/
    └── api.ts                   # Serviço de API
```

### Tecnologias Utilizadas
- **React Native**: Framework mobile
- **Expo**: Plataforma de desenvolvimento
- **React Navigation**: Navegação entre telas
- **Axios**: Cliente HTTP
- **AsyncStorage**: Armazenamento local
- **TypeScript**: Tipagem estática

## 🚨 Troubleshooting

### Problemas de Conexão
1. **Verifique o IP do BFF**: Certifique-se de que o IP está correto no `api.ts`
2. **Teste a conectividade**: Use `ping` ou `curl` para verificar se o BFF está acessível
3. **Firewall**: Verifique se a porta 8080 está liberada

### Problemas de Autenticação
1. **Token expirado**: O app limpa automaticamente tokens expirados
2. **Credenciais incorretas**: Verifique email e senha
3. **BFF offline**: Certifique-se de que o BFF está rodando

### Problemas de Invoice
1. **LNBits offline**: Os endpoints de invoice dependem do LNBits estar funcionando
2. **Conexão de rede**: Verifique a conectividade com o LNBits

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console
2. Teste os endpoints diretamente no BFF
3. Verifique a documentação do BFF Luma

## 🔄 Atualizações

Para atualizar o app:
1. Pare o servidor de desenvolvimento (`Ctrl+C`)
2. Execute `npm install` para instalar novas dependências
3. Execute `npm start` para reiniciar

---

**Desenvolvido para integração com BFF Luma - Gerenciamento de Carteiras Lightning**
