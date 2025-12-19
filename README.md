# SaaS - Sistema de Assinaturas

## 📋 Visão Geral

Sistema SaaS completo para gerenciamento de assinaturas, permitindo que empresas cadastradas na plataforma vendam assinaturas para seus próprios clientes através do Stripe Connect.

## 🎯 Objetivo Principal
Criar um sistema modular e reutilizável de gestão de assinaturas que possa ser integrado em diferentes produtos SaaS da empresa, com capacidade de "copiar e colar" em outros escopos.

## 🏗️ Arquitetura do Sistema
### Stack Tecnológica

Backend:

• NestJS 11 - Framework TypeScript progressivo

• Prisma ORM 7 - ORM type-safe para PostgreSQL

• PostgreSQL - Banco de dados relacional

• JWT - Autenticação por tokens

• Stripe SDK - Integração com pagamentos

## 📁 Estrutura do Projeto

      p6hub-subs/
      ├── api/                          # Backend NestJS
      │   ├── src/
      │   │   ├── modules/
      │   │   │   ├── stripe/          # Integração Stripe principal
      │   │   │   └── stripe-connect/  # Stripe Connect para empresas
      │   │   ├── public/              # Endpoints públicos (cadastro)
      │   │   ├── company-auth/        # Autenticação de empresas
      │   │   ├── super-admin/         # Painel de administração
      │   │   ├── subscriptions/       # Gestão de assinaturas
      │   │   ├── webhooks/            # Processamento de webhooks
      │   │   └── seed/                # Seed de dados iniciais
      │   ├── prisma/
      │   │   └── schema.prisma        # Schema do banco de dados
      │   └── scripts/                 # Scripts utilitários

## ⚙️ Configuração do Ambiente
### Pré-requisitos

Node.js 22+

PostgreSQL

Conta Stripe

Stripe CLI

### Variáveis de Ambiente (.env)

    # Banco de dados
    DATABASE_URL="postgresql://usuario:senha@localhost:5432/p6hub_subscriptions?schema=public"

    # Super Admin
    SUPER_ADMIN_EMAIL=admin@sistema.com
    SUPER_ADMIN_PASSWORD=senha_segura
    SUPER_ADMIN_NAME="Super Admin"

    # JWT
    JWT_SECRET=secreto_jwt_aleatorio_aqui

    # Stripe (MODO DE TESTE)
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_PUBLISHABLE_KEY=pk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...

    # URLs
    FRONTEND_URL=http://localhost:3000
    BACKEND_URL=http://localhost:3030

### Instalação

    # 1. Clonar repositório
    git clone <repositorio>
    cd p6hub-subs

    # 2. Instalar dependências do backend
    cd api
    npm install

    # 3. Configurar banco de dados
    npx prisma migrate dev --name init
    npx prisma generate

    # 4. Criar Super Admin
    npm run seed:super-admin

    # 5. Iniciar servidor
    npm run start:dev

## 🚀 Como Executar

### Desenvolvimento

    # Modo desenvolvimento com hot-reload
    npm run start:dev

    # Testar integração Stripe
    npm run test:stripe

    # Monitorar webhooks Stripe localmente
    npm run stripe:listen
### Produção

    # Build do projeto
    npm run build

    # Executar em produção
    npm run start:prod

## 🔐 Sistema de Autenticação

### Múltiplas Camadas de Autenticação

1. Super Admin - Administrador global do sistema

    ৹ Endpoint: /super-admin/auth/login

    ৹ Role: SUPER_ADMIN

2. Company User - Usuários das empresas cadastradas

    ৹ Endpoint: /company-auth/login

    ৹ Role: COMPANY_USER

### Fluxo de Autenticação
    // Exemplo de login empresa
    POST /company-auth/login
    {
      "email": "empresa@email.com",
      "password": "senha"
    }

    // Resposta
    {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "companyUser": {
        "id": "abc123",
        "email": "empresa@email.com",
        "company": {
          "id": "comp123",
          "name": "Minha Empresa"
        }
      }
    }

## 💳 Integração Stripe Connect

### Configuração por Empresa

Cada empresa cadastrada pode configurar sua própria conta Stripe Connect para receber pagamentos diretamente.

    # 1. Empresa cria conta Stripe Connect
    POST /company/stripe/account/setup
    Authorization: Bearer <token_empresa>
    {
      "returnUrl": "https://minhaempresa.com/dashboard",
      "refreshUrl": "https://minhaempresa.com/stripe/refresh"
    }

    # 2. Empresa cria produto/plano
    POST /company/stripe/products/create
    {
      "name": "Plano Pro",
      "amount": 9900, // R$ 99,00 em centavos
      "currency": "brl",
      "interval": "month"
    }

    # 3. Empresa cria checkout para cliente
    POST /company/stripe/checkout/create
    {
      "priceId": "price_123abc",
      "customerEmail": "cliente@email.com",
      "successUrl": "https://minhaempresa.com/success",
      "cancelUrl": "https://minhaempresa.com/cancel"
    }
### Fluxo de Pagamento

1. <b>Cliente</b> → Acessa checkout da empresa

2. <b>P6Hub</b> → Cria sessão Stripe na conta da empresa

3. <b>Stripe</b> → Processa pagamento → Conta da empresa

4. <b>Webhook</b> → Notifica P6Hub → Atualiza status

5. <b>Empresa</b> → Recebe pagamento diretamente

## 📊 Modelo de Dados

### Entidades Principais

    prisma
    model Company {
      id                   String
      name                 String
      email                String
      stripeAccountId      String?  // Conta Stripe Connect
      stripeAccountStatus  String?  // Status da conta
    }

    model CompanyUser {
      id         String
      email      String
      company    Company
    }

    model Plan {
      id              String
      name            String
      price           Int
      company         Company  // Plano pertence a uma empresa
      stripePriceId   String?  // ID do preço na conta da empresa
    }

    model Customer {
      id         String
      email      String
      company    Company  // Cliente de uma empresa específica
    }

    model Subscription {
      id                   String
      status               SubscriptionStatus
      customer             Customer  // Cliente da empresa
      plan                 Plan      // Plano da empresa
      company              Company   // Empresa que vendeu
      stripeSubscriptionId String?   // Assinatura no Stripe da empresa
    }

## 🔄 Fluxos Principais

### 1. Cadastro de Nova Empresa

    FRONTEND (Steps) → BACKEND (Transação)
    1. Dados da Empresa ──┐
    2. Endereço           ├─→ POST /public/signup
    3. Usuário Admin    ──┘
                        ↓
    Cria: Empresa + Endereço + Usuário + Customer
                        ↓
    Retorna: Token JWT + ID da Empresa
                        ↓
    Redireciona: /subscriptions/plans (com token)

### 2. Configuração de Pagamentos (Empresa)

    Empresa Logada → Configura Stripe Connect
    1. POST /company/stripe/account/setup
      ↓
    2. Completa onboarding no Stripe
      ↓
    3. Cria planos: POST /company/stripe/products/create
      ↓
    4. Pronta para vender assinaturas

### 3. Venda de Assinatura (Empresa → Cliente)

    Cliente da Empresa → Checkout → Pagamento
    1. Empresa gera checkout: POST /company/stripe/checkout/create
      ↓
    2. Cliente paga no Stripe (conta da empresa)
      ↓
    3. Webhook: checkout.session.completed
      ↓
    4. Sistema cria: Subscription (status: ACTIVE)
      ↓
    5. Empresa recebe pagamento diretamente

## 🛡️ Webhooks e Eventos
### Eventos Stripe Monitorados

    // Webhook endpoint
    POST /webhooks/stripe

    // Eventos processados:
    - checkout.session.completed
    - checkout.session.expired
    - invoice.paid
    - invoice.payment_failed
    - customer.subscription.updated
    - customer.subscription.deleted

### Configuração de Webhooks Locais

    # Instalar Stripe CLI
    stripe login

    # Escutar eventos localmente
    stripe listen --forward-to localhost:4000/webhooks/stripe

    # Testar eventos
    stripe trigger checkout.session.completed

## 📈 Dashboard Super Admin

### Funcionalidades Disponíveis

    GET    /super-admin/companies      # Listar empresas
    POST   /super-admin/companies      # Criar empresa
    PUT    /super-admin/companies/:id  # Atualizar empresa
    DELETE /super-admin/companies/:id  # Deletar empresa

    GET    /super-admin/subscriptions  # Listar assinaturas
    GET    /super-admin/metrics        # Métricas do sistema

## 🧪 Testes

### Testes de Integração Stripe

    # Executar teste de integração
    npm run test:stripe

    # Saída esperada:
    ✅ Conexão bem-sucedida
    ✅ Customer criado
    ✅ Produto criado
    ✅ Preço criado
    ✅ Checkout session criada

### Cartões de Teste Stripe

    4242424242424242 - Pagamento bem-sucedido
    4000000000003220 - 3D Secure requerido
    4000000000009995 - Falha no pagamento
    5555555555554444 - Cartão Mastercard

## 🔧 Scripts Úteis

# Comandos disponíveis
    npm run start:dev        # Desenvolvimento
    npm run build           # Build produção
    npm run test:stripe     # Teste Stripe
    npm run stripe:listen   # Webhooks locais
    npm run db:seed         # Seed Super Admin
    npm run prisma:generate # Gerar client Prisma