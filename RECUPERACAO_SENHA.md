# Recuperação de Senha - Fluxo Completo

## Visão Geral

A funcionalidade de recuperação de senha foi implementada para permitir que o usuário receba um email com um link que, quando clicado, abre o aplicativo móvel diretamente na tela de redefinição de senha.

## Fluxo de Funcionamento

### 1. Solicitação de Recuperação
- Usuário acessa a tela "Esqueci a senha" no app
- Digita seu email
- Sistema envia email com link de recuperação

### 2. Email de Recuperação
- Email contém link: `https://luma.app.br/reset-password?token=TOKEN`
- Link direciona para página web que valida o token
- Página web redireciona para o app via deep link

### 3. Redirecionamento para o App
- Deep link: `bffluma://reset-password?token=TOKEN`
- App abre automaticamente na tela de reset de senha
- Token é extraído da URL e validado

### 4. Redefinição de Senha
- Usuário digita nova senha no app
- Sistema valida e atualiza a senha
- Usuário é redirecionado para login

## Componentes Implementados

### Backend (Go)

#### Novas Rotas
- `GET /reset-password` - Página HTML de validação
- `POST /api/v1/validate-reset-token` - Validação de token

#### Novos Métodos
- `ResetPasswordPage()` - Renderiza página HTML
- `ValidateResetToken()` - Valida token via API

#### Novos Modelos
- `ValidateResetTokenRequest`
- `ValidateResetTokenResponse`

### Frontend (React Native)

#### Deep Linking
- Scheme configurado: `bffluma://`
- Rota: `reset-password?token=TOKEN`

#### Tela Atualizada
- `ResetPasswordScreen` - Recebe token via deep link
- Validação automática do token
- Interface para nova senha

## Configurações Necessárias

### Backend (.env)
```env
APP_DOMAIN=luma.app.br
APP_PROTOCOL=https
```

### Frontend (app.json)
```json
{
  "expo": {
    "scheme": "bffluma"
  }
}
```

## Segurança

- Tokens expiram em 1 hora
- Tokens são únicos e de uso único
- Validação dupla (web + app)
- Rate limiting para prevenção de spam

## Testes

### Teste Manual
1. Solicitar recuperação de senha
2. Verificar email recebido
3. Clicar no link do email
4. Verificar redirecionamento para app
5. Testar redefinição de senha

### Teste Automatizado
```bash
# Backend
cd bff_luma && go test ./...

# Frontend
cd mobile_luma && npm test
```

## Troubleshooting

### Problemas Comuns

1. **App não abre**
   - Verificar se scheme está configurado
   - Verificar se app está instalado

2. **Token inválido**
   - Verificar expiração (1 hora)
   - Verificar se já foi usado

3. **Email não recebido**
   - Verificar configurações SMTP
   - Verificar spam/junk

### Logs
- Backend: logs de criação e validação de tokens
- Frontend: logs de deep linking e validação
