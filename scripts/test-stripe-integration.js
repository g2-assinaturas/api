/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeIntegration() {
  console.log('🔧 Testando integração com Stripe...\n');

  try {
    // Testar conexão com Stripe
    console.log('1. Testando conexão com Stripe...');
    const balance = await stripe.balance.retrieve();
    console.log('   ✅ Conexão bem-sucedida');
    console.log(
      '   💰 Saldo disponível:',
      balance.available[0]?.amount / 100,
      balance.available[0]?.currency,
    );

    // Testar criação de customer
    console.log('\n2. Testando criação de customer...');
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Cliente de Teste',
      metadata: {
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('   ✅ Customer criado:', testCustomer.id);

    // Testar criação de produto
    console.log('\n3. Testando criação de produto...');
    const testProduct = await stripe.products.create({
      name: 'Plano de Teste',
      description: 'Plano de teste para desenvolvimento',
      metadata: {
        test: 'true',
        planId: 'test-plan-123',
      },
    });
    console.log('   ✅ Produto criado:', testProduct.id);

    // Testar criação de preço
    console.log('\n4. Testando criação de preço...');
    const testPrice = await stripe.prices.create({
      product: testProduct.id,
      unit_amount: 1999, // R$ 19,99
      currency: 'brl',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        test: 'true',
        interval: 'MONTHLY',
      },
    });
    console.log('   ✅ Preço criado:', testPrice.id);

    // Testar criação de checkout session
    console.log('\n5. Testando criação de checkout session...');
    const testSession = await stripe.checkout.sessions.create({
      customer: testCustomer.id,
      line_items: [
        {
          price: testPrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url:
        'http://localhost:3000/test/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/test/cancel',
      metadata: {
        test: 'true',
        customerId: testCustomer.id,
      },
    });
    console.log('   ✅ Checkout session criada:', testSession.id);
    console.log('   🔗 URL de pagamento:', testSession.url);

    // Testar webhook
    console.log('\n6. Informações para webhook de teste:');
    console.log('   📍 Endpoint: POST http://localhost:4000/webhooks/stripe');
    console.log(
      '   🔑 Assinatura: Use o comando Stripe CLI para testar webhooks locais',
    );
    console.log(
      '   💡 Comando: stripe listen --forward-to localhost:4000/webhooks/stripe',
    );

    // Listar cartões de teste
    console.log('\n7. Cartões de teste disponíveis:');
    const testCards = [
      { number: '4242424242424242', description: 'Pagamento bem-sucedido' },
      { number: '4000000000003220', description: '3D Secure requerido' },
      { number: '4000000000009995', description: 'Falha no pagamento' },
      { number: '5555555555554444', description: 'Cartão Mastercard' },
    ];

    testCards.forEach((card) => {
      console.log(`   💳 ${card.number} - ${card.description}`);
    });

    // Limpar dados de teste
    console.log('\n8. Para limpar dados de teste:');
    console.log('   🗑️  Customer:', testCustomer.id);
    console.log('   🗑️  Product:', testProduct.id);
    console.log('   🗑️  Price:', testPrice.id);

    console.log('\n🎉 Testes concluídos com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Configure o Stripe CLI para testar webhooks localmente');
    console.log('   2. Use os cartões de teste para simular pagamentos');
    console.log(
      '   3. Monitore os logs do servidor para ver os eventos processados',
    );
    console.log(
      '   4. Verifique o banco de dados para confirmar as atualizações',
    );
  } catch (error) {
    console.error('❌ Erro ao testar integração Stripe:', error.message);
    process.exit(1);
  }
}

// Executar teste
testStripeIntegration();
